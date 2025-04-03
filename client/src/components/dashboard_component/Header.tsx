import { Settings, RefreshCw} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "./DatePickerWithRange";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import HeaderTutorialButton from "../Tutorial/HeaderTutorialButton";
import { useDispatch, useSelector } from "react-redux";
import { setLocale } from "@/store/slices/LocalSlice";
import { RootState } from "@/store";

interface HeaderProps {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  showDatePicker?: boolean;
  showSettings?: boolean;
  showRefresh?: boolean;
  isLoading?: boolean;
  handleManualRefresh?: () => void;
}
 
export default function Header({
  title,
  Icon,
  showDatePicker = false,
  showSettings = false,
  showRefresh = false,
  isLoading = false,
  handleManualRefresh,
}: HeaderProps) {

  const dispatch = useDispatch();
  const locale = useSelector((state: RootState) => state.locale.locale);

  return (
    <header className="sticky top-0 z-40 bg-white border-b px-6 py-3 transition-all duration-300">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-3">
          <div className="rounded-lg bg-secondary p-2 transition-transform duration-300 ease-in-out hover:scale-110">
            <Icon className="h-6 w-6 text-secondary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-secondary-foreground to-primary">
            {title}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex flex-row items-center space-x-2">
          {showDatePicker && (
            <div className="transition-transform duration-300 ease-in-out hover:scale-105">
              <DatePickerWithRange
                defaultDate={{
                  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  to: new Date()
                }}
              />
            </div>
          )}

          {showRefresh && (
            <div className="md:flex items-center hidden">
              <Button onClick={handleManualRefresh} disabled={isLoading} className="flex items-center">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          )}

          {/* Rest of the component remains the same */}
          {showSettings && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="grid gap-2">
                  <h3 className="font-medium">Locale Settings</h3>
                  <div className="flex flex-col space-y-2">
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="locale"
                        value="en-IN"
                        checked={locale === "en-IN"}
                        onChange={() => dispatch(setLocale("en-IN"))}
                        className="mr-2"
                      />
                      Indian Formatting
                    </label>
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="locale"
                        value="en-US"
                        checked={locale === "en-US"}
                        onChange={() => dispatch(setLocale("en-US"))}
                        className="mr-2"
                      />
                      Western Formatting
                    </label>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <HeaderTutorialButton />
        </div>
      </div>
    </header>
  );
}