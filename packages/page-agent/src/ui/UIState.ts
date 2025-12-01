/**
 * Agent execution state management
 */

export interface Step {
	id: string
	stepNumber: number
	timestamp: Date
	type: 'thinking' | 'tool_executing' | 'completed' | 'error' | 'output' | 'input' | 'retry'

	// Tool execution related
	toolName?: string
	toolArgs?: any
	toolResult?: any

	// Display data
	displayText: string
	duration?: number
}

export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error'

export class UIState {
	private steps: Step[] = []
	private currentStep: Step | null = null
	private status: AgentStatus = 'idle'
	private stepCounter = 0

	addStep(stepData: Omit<Step, 'id' | 'stepNumber' | 'timestamp'>): Step {
		const step: Step = {
			id: this.generateId(),
			stepNumber: ++this.stepCounter,
			timestamp: new Date(),
			...stepData,
		}

		this.steps.push(step)
		this.currentStep = step

		// Update overall status
		this.updateStatus(step.type)

		return step
	}

	updateCurrentStep(updates: Partial<Step>): Step | null {
		if (!this.currentStep) return null

		Object.assign(this.currentStep, updates)
		return this.currentStep
	}

	getCurrentStep(): Step | null {
		return this.currentStep
	}

	getAllSteps(): Step[] {
		return [...this.steps]
	}

	getStatus(): AgentStatus {
		return this.status
	}

	reset(): void {
		this.steps = []
		this.currentStep = null
		this.status = 'idle'
		this.stepCounter = 0
	}

	private updateStatus(stepType: Step['type']): void {
		switch (stepType) {
			case 'thinking':
			case 'tool_executing':
			case 'output':
			case 'input':
			case 'retry':
				this.status = 'running'
				break
			case 'completed':
				this.status = 'completed'
				break
			case 'error':
				this.status = 'error'
				break
		}
	}

	private generateId(): string {
		return `step_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
	}
}
