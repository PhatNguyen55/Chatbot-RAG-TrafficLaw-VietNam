import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

export function ModelsSelector() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="space-x-2">
          <span>GPT-4</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>GPT-4</DropdownMenuItem>
        <DropdownMenuItem>GPT-3.5</DropdownMenuItem>
        <DropdownMenuItem>Claude 2</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}