import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings } from "lucide-react";
import { setLocale } from "@/store/slices/LocalSlice";
import { RootState } from "@/store";

interface NumberFormatSelectorProps {
  size?: "icon" | "default" | "sm" | "lg";
  variant?: "outline" | "link" | "default" | "destructive" | "secondary" | "ghost";
  iconSize?: string;
  className?: string;
}

const NumberFormatSelector = ({ 
  size = "icon", 
  variant = "outline",
  iconSize = "h-4 w-4",
  className = ""
}: NumberFormatSelectorProps) => {
  const dispatch = useDispatch();
  const locale = useSelector((state: RootState) => state.locale.locale);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant={variant as "outline" | "link" | "default" | "destructive" | "secondary" | "ghost"} 
          size={size as "icon" | "default" | "sm" | "lg"} 
          className={className}
        >
          <Settings className={iconSize} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="grid gap-3">
          <h3 className="font-medium text-sm">Number Format Preferences</h3>
          <div className="flex flex-col space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="locale"
                value="en-IN"
                checked={locale === "en-IN"}
                onChange={() => dispatch(setLocale("en-IN"))}
                className="form-radio"
              />
              <span>Indian</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="locale"
                value="en-US"
                checked={locale === "en-US"}
                onChange={() => dispatch(setLocale("en-US"))}
                className="form-radio"
              />
              <span>International</span>
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NumberFormatSelector;