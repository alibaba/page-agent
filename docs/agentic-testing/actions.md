# Action regression checklist

## Setup

1. Build: `npm run build -w @page-agent/page-controller`.
2. Load `packages/page-controller/dist/lib/page-controller.js` in the page via `import()` (URL or Blob).
3. Call exported actions directly on DOM elements; do not instantiate `PageController` or modify the bundle.

## Cases

| ID           | Page / demo                                                                                               | Actions                                     | Expected                                              |
| ------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| bing-suggest | [Bing](https://bing.com/)                                                                                 | Input `weather tomorrow`.                   | Suggestions appear; input retains focus.              |
| bing-submit  | [Bing](https://bing.com/)                                                                                 | Input `weather tomorrow`; click search.     | Results page with the same query.                     |
| antd-select  | [AntD Select](https://ant.design/components/select/) — searchable                                         | Filter, select, reopen.                     | Matching option selected; value retained.             |
| el-select    | [Element Plus Select](https://element-plus.org/en-US/component/select.html) — clearable / disabled        | Select, clear, reselect.                    | Value updates; disabled options remain unavailable.   |
| el-menu      | [Element Plus Menu](https://element-plus.org/en-US/component/menu.html) — Side bar                        | Click title/icon, select child, collapse.   | Submenu toggles once; child independently selectable. |
| antd-tree    | [AntD Tree](https://ant.design/components/tree/) — Basic                                                  | Expand, select, check child.                | Corresponding states update.                          |
| el-date      | [Element Plus DatePicker](https://element-plus.org/en-US/component/date-picker.html) — Date Range         | Pick range, reopen, clear.                  | Dates persist; clear removes both.                    |
| quill        | [Quill](https://quilljs.com/docs/quickstart)                                                              | Replace, clear, retype, blur, edit again.   | No duplication or old content returning.              |
| el-scroll    | [Element Plus Scrollbar](https://element-plus.org/en-US/component/scrollbar.html) — vertical / horizontal | Scroll target container in both directions. | Correct region and direction.                         |
| mui-input    | [MUI Autocomplete](https://mui.com/material-ui/react-autocomplete/) — Controlled states                   | Type, select, clear.                        | Displayed inputValue/value stay consistent.           |
| radix-select | [Radix Select](https://www.radix-ui.com/primitives/docs/components/select)                                | Select, reopen, select another.             | Value updates; focus returns to trigger.              |

## References

- el-menu: [PR #378](https://github.com/alibaba/page-agent/pull/378)
- el-date: [Issue #336](https://github.com/alibaba/page-agent/issues/336)
- quill: [PR #179](https://github.com/alibaba/page-agent/pull/179)
- el-scroll: [PR #390](https://github.com/alibaba/page-agent/pull/390)
