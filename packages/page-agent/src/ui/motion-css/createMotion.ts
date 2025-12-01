import styles from './motion.module.css'

export function createMotion() {
	const wrapper = document.createElement('div')
	wrapper.className = styles.wrapper

	{
		const colorWrapper = document.createElement('div')
		colorWrapper.className = styles.colorWrapper
		wrapper.appendChild(colorWrapper)

		const layerA = document.createElement('div')
		layerA.className = styles.colorLayer + ' ' + styles.layerA
		colorWrapper.appendChild(layerA)

		const layerB = document.createElement('div')
		layerB.className = styles.colorLayer + ' ' + styles.layerB
		colorWrapper.appendChild(layerB)

		const layerC = document.createElement('div')
		layerC.className = styles.colorLayer + ' ' + styles.layerC
		colorWrapper.appendChild(layerC)
	}

	{
		const borderWrapper = document.createElement('div')
		borderWrapper.className = styles.borderWrapper
		wrapper.appendChild(borderWrapper)

		const layerA = document.createElement('div')
		layerA.className = styles.borderLayer + ' ' + styles.layerA
		borderWrapper.appendChild(layerA)

		const layerB = document.createElement('div')
		layerB.className = styles.borderLayer + ' ' + styles.layerB
		borderWrapper.appendChild(layerB)

		const layerC = document.createElement('div')
		layerC.className = styles.borderLayer + ' ' + styles.layerC
		borderWrapper.appendChild(layerC)
	}

	function show() {
		wrapper.classList.remove(styles.exit)
		wrapper.classList.remove(styles.entry)
		// Force reflow to restart animation
		void wrapper.offsetHeight
		wrapper.classList.add(styles.entry)
	}

	function hide() {
		wrapper.classList.remove(styles.entry)
		wrapper.classList.remove(styles.exit)
		// Force reflow to restart animation
		void wrapper.offsetHeight
		wrapper.classList.add(styles.exit)
	}

	return {
		element: wrapper,
		show,
		hide,
	}
}
