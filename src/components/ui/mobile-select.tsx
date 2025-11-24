"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile.tsx"
import { useDynamicZIndex } from "@/contexts/ZIndexContext"
import {
  Select,
  SelectContent as BaseSelectContent,
  SelectItem as BaseSelectItem,
  SelectTrigger as BaseSelectTrigger,
  SelectValue,
  type SelectProps
} from "@/components/ui/select"

interface MobileSelectItem {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

interface MobileSelectProps extends Omit<SelectProps, 'children'> {
  children: React.ReactNode
  placeholder?: string
  selectId?: string
}

export function MobileSelect({ children, placeholder, selectId, ...selectProps }: MobileSelectProps) {
  const isMobile = useIsMobile()
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const { contentZIndex } = useDynamicZIndex(selectId || 'mobile-select', 'modal')
  
  // Extract items from children
  const items = React.useMemo(() => {
    const extractedItems: MobileSelectItem[] = []
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        // Handle SelectItem
        if (child.type && (child.type as any).displayName === 'SelectItem') {
          extractedItems.push({
            value: child.props.value || '',
            label: child.props.children,
            disabled: child.props.disabled
          })
        }
        // Handle SelectGroup
        else if (child.type && (child.type as any).displayName === 'SelectGroup') {
          React.Children.forEach(child.props.children, (groupChild) => {
            if (React.isValidElement(groupChild) && (groupChild.type as any).displayName === 'SelectItem') {
              extractedItems.push({
                value: groupChild.props.value || '',
                label: groupChild.props.children,
                disabled: groupChild.props.disabled
              })
            }
          })
        }
      }
    })
    return extractedItems
  }, [children])
  
  // Get current selected value label
  const selectedItem = React.useMemo(() => {
    if (!selectProps.value) return null
    return items.find(item => item.value === selectProps.value)
  }, [items, selectProps.value])
  
  // On mobile, render button + modal
  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between h-8 !rounded-lg border border-input bg-gray-100 dark:bg-gray-600 px-2.5 py-1.5 text-sm font-normal",
            "hover:bg-accent hover:text-accent-foreground",
            selectProps.disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !selectProps.disabled && setIsModalOpen(true)}
          disabled={selectProps.disabled}
        >
          <span className="truncate">
            {selectedItem ? selectedItem.label : placeholder || 'Select option...'}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
        </Button>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent 
            className="max-w-full w-full h-full max-h-screen p-0 m-0 rounded-none flex flex-col fixed inset-0 translate-x-0 translate-y-0"
            dialogId={`mobile-select-modal-${selectId || 'default'}`}
            style={{ zIndex: contentZIndex + 100 }}
          >
            <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0 border-b">
              <DialogTitle>{placeholder || 'Select option'}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 px-4 py-2">
              <div className="space-y-1">
                {items.map((item) => {
                  const isSelected = selectProps.value === item.value
                  return (
                    <Button
                      key={item.value}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-auto py-4 px-4 text-left font-normal text-base",
                        "hover:bg-accent",
                        isSelected && "bg-accent",
                        item.disabled && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={item.disabled}
                      onClick={() => {
                        if (!item.disabled && selectProps.onValueChange) {
                          selectProps.onValueChange(item.value)
                          setIsModalOpen(false)
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1">{item.label}</div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </>
    )
  }
  
  // Desktop: render normal Select
  return (
    <Select {...selectProps}>
      {children}
    </Select>
  )
}

// Re-export Select components for convenience
export {
  SelectContent: BaseSelectContent,
  SelectItem: BaseSelectItem,
  SelectTrigger: BaseSelectTrigger,
  SelectValue,
  SelectGroup
} from "@/components/ui/select"

