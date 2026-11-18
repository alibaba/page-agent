#!/usr/bin/env python3
import json
import math
import sys
from pathlib import Path

import fitz


def inspect_pdf(pdf_path):
    document = fitz.open(pdf_path)
    try:
        if document.needs_pass:
            raise ValueError("Encrypted PDFs requiring a password are not supported")
        trailer_encrypted = document.xref_get_key(-1, "Encrypt")[0] != "null"
        pages = []
        for index, page in enumerate(document):
            pages.append(
                {
                    "page": index + 1,
                    "width": page.rect.width,
                    "height": page.rect.height,
                    "text": page.get_text("text"),
                }
            )
        return {
            "pageCount": document.page_count,
            "pages": pages,
            "encrypted": bool(document.is_encrypted or trailer_encrypted),
            "signatureFlags": int(document.get_sigflags()),
        }
    finally:
        document.close()


def parse_color(value, default=(0, 0, 0)):
    if value is None:
        return default
    if not isinstance(value, list) or len(value) != 3:
        raise ValueError("color must be an RGB array with three values from 0 to 1")
    color = tuple(float(item) for item in value)
    if any(not math.isfinite(item) or item < 0 or item > 1 for item in color):
        raise ValueError("color values must be between 0 and 1")
    return color


def find_text(page, operation):
    matches = page.search_for(operation["search"])
    number = int(operation["occurrence"])
    if number < 1 or number > len(matches):
        raise ValueError(f"{operation['id']}: occurrence {number} was not found")
    matches = [matches[number - 1]]
    if not matches:
        raise ValueError(f"{operation['id']}: search text was not found on page {operation['page']}")
    return matches


def bounded_number(value, name, minimum, maximum):
    number = float(value)
    if not math.isfinite(number) or number < minimum or number > maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return number


def validate_rect(page, rectangle, operation_id):
    if rectangle.is_empty or rectangle.is_infinite or not page.rect.contains(rectangle):
        raise ValueError(f"{operation_id}: requested rectangle is outside the page bounds")
    return rectangle


def replace_text(page, operation):
    matches = find_text(page, operation)
    fill = parse_color(operation.get("fillColor"), (1, 1, 1))
    for rectangle in matches:
        page.add_redact_annot(rectangle, fill=fill)
    page.apply_redactions()
    replacement = operation.get("replacement", "")
    if not replacement:
        return
    font_size = bounded_number(operation.get("fontSize", 11), "fontSize", 1, 200)
    color = parse_color(operation.get("color"))
    for rectangle in matches:
        width = max(rectangle.width, len(replacement) * font_size * 0.58)
        target = validate_rect(
            page,
            fitz.Rect(rectangle.x0, rectangle.y0, min(rectangle.x0 + width, page.rect.x1), min(rectangle.y1 + 4, page.rect.y1)),
            operation["id"],
        )
        remaining = page.insert_textbox(target, replacement, fontsize=font_size, color=color)
        if remaining < 0:
            raise ValueError(f"{operation['id']}: replacement text does not fit its target rectangle")


def redact_text(page, operation):
    fill = parse_color(operation.get("fillColor"), (0, 0, 0))
    for rectangle in find_text(page, operation):
        page.add_redact_annot(rectangle, fill=fill)
    page.apply_redactions()


def add_text(page, operation):
    x = bounded_number(operation.get("x", 72), "x", 0, page.rect.width)
    y = bounded_number(operation.get("y", 72), "y", 0, page.rect.height)
    width = bounded_number(operation.get("width", page.rect.width - x - 36), "width", 0.01, page.rect.width)
    height = bounded_number(operation.get("height", 72), "height", 0.01, page.rect.height)
    target = validate_rect(page, fitz.Rect(x, y, x + width, y + height), operation["id"])
    remaining = page.insert_textbox(
        target,
        operation["text"],
        fontsize=bounded_number(operation.get("fontSize", 11), "fontSize", 1, 200),
        color=parse_color(operation.get("color")),
    )
    if remaining < 0:
        raise ValueError(f"{operation['id']}: text does not fit in the requested rectangle")


def apply_operation(document, operation):
    page = document[operation["page"] - 1]
    operation_type = operation["type"]
    if "search" in operation:
        operation["_beforeSearchCount"] = len(page.search_for(operation["search"]))
    operation["_beforeAnnotationCount"] = sum(1 for _ in (page.annots() or []))
    if operation_type == "replace_text":
        replace_text(page, operation)
    elif operation_type == "redact_text":
        redact_text(page, operation)
    elif operation_type == "add_text":
        add_text(page, operation)
    elif operation_type == "add_note":
        x = bounded_number(operation.get("x", 36), "x", 0, page.rect.width)
        y = bounded_number(operation.get("y", 36), "y", 0, page.rect.height)
        point = fitz.Point(x, y)
        page.add_text_annot(point, operation["text"])
    elif operation_type == "highlight_text":
        for rectangle in find_text(page, operation):
            page.add_highlight_annot(rectangle)
    elif operation_type == "rotate_page":
        operation["_expectedRotation"] = (page.rotation + int(operation["angle"])) % 360
        page.set_rotation(operation["_expectedRotation"])
    else:
        raise ValueError(f"Unsupported operation type: {operation_type}")


def validate_operation(document, operation):
    page = document[operation["page"] - 1]
    text = page.get_text("text")
    operation_type = operation["type"]
    if operation_type == "replace_text":
        replacement_present = operation["replacement"] in text
        expected_max = operation["_beforeSearchCount"] - 1 + operation["replacement"].count(operation["search"])
        passed = replacement_present and len(page.search_for(operation["search"])) <= expected_max
    elif operation_type == "redact_text":
        passed = len(page.search_for(operation["search"])) == operation["_beforeSearchCount"] - 1
    elif operation_type == "add_text":
        passed = operation["text"] in text
    elif operation_type == "add_note":
        passed = any((annot.info or {}).get("content") == operation["text"] for annot in (page.annots() or []))
    elif operation_type == "highlight_text":
        passed = operation["search"] in text and sum(1 for _ in (page.annots() or [])) > operation["_beforeAnnotationCount"]
    elif operation_type == "rotate_page":
        passed = page.rotation % 360 == int(operation["_expectedRotation"]) % 360
    else:
        passed = False
    return {"name": f"{operation['id']} ({operation_type}, page {operation['page']})", "passed": passed}


def apply_pdf(input_path, output_path, operations):
    document = fitz.open(input_path)
    original_pages = document.page_count
    try:
        for operation in operations:
            apply_operation(document, operation)
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        document.save(output_path, garbage=4, deflate=True)
    finally:
        document.close()
    output = fitz.open(output_path)
    try:
        checks = [{"name": "output opens with unchanged page count", "passed": output.page_count == original_pages}]
        checks.extend(validate_operation(output, operation) for operation in operations)
        if not all(check["passed"] for check in checks):
            raise ValueError(f"PDF validation failed: {checks}")
        return {"checks": checks, "pageCount": output.page_count}
    finally:
        output.close()


def main():
    command = sys.argv[1]
    if command == "inspect":
        result = inspect_pdf(sys.argv[2])
    elif command == "apply":
        payload = json.load(sys.stdin)
        result = apply_pdf(sys.argv[2], sys.argv[3], payload["operations"])
    else:
        raise ValueError(f"Unknown command: {command}")
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
