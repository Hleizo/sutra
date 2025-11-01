import React, { useRef, useImperativeHandle, forwardRef } from 'react'
import CartoonAssistant from './CartoonAssistant'

export interface AssistantHandle {
  speak: (text: string, lang?: string) => Promise<void>
}

interface AssistantControllerProps {
  size?: number
  position?: 'bottom-left' | 'bottom-right' | 'top-right' | 'top-left'
}

/**
 * Controllable CartoonAssistant that exposes speak method via ref
 */
const AssistantController = forwardRef<AssistantHandle, AssistantControllerProps>(
  ({ size = 200, position = 'bottom-right' }, ref) => {
    const speakFnRef = useRef<((text: string, lang?: string) => Promise<void>) | null>(null)

    // Expose speak method to parent via ref
    useImperativeHandle(ref, () => ({
      speak: async (text: string, lang: string = 'ar-SA') => {
        if (speakFnRef.current) {
          await speakFnRef.current(text, lang)
        } else {
          console.warn('Assistant speak function not initialized')
        }
      },
    }))

    return (
      <CartoonAssistant
        size={size}
        position={position}
        onReady={(speakFn) => {
          speakFnRef.current = speakFn
        }}
      />
    )
  }
)

AssistantController.displayName = 'AssistantController'

export default AssistantController
