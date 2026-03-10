import { InputType } from "@/Types/InputTypes";

interface Props {
  name: string;
  title?: string;
  type: InputType;
  isRequired?: boolean;
  placeholder?: string;
  value?: string | number;
  isDisabled?: boolean;
  children?: React.ReactNode;
}
export default function FormInput({
  name,
  title,
  type,
  isRequired,
  placeholder,
  value,
  isDisabled,
  children,
}: Props) {
  return (
    <div className="flex-1 mb-4">
      <label className="block text-sm dark:text-white mb-1 capitalize font-bold">
        {title ? title : children}
        {isRequired && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        required={isRequired}
        disabled={isDisabled}
        aria-describedby="helper-text-explanation"
        step="any"
        className={`w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 
      focus:ring-[#5C6B73] focus:border-[#5C6B73] dark:border-2 dark:border-[#9DB4C0] 
      dark:text-[#E0FBFC] flex-1 min-w-50 
      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        ${isDisabled ? "dark:bg-gray-700/70" : "dark:bg-gray-700/20"}
      `}
      />
    </div>
  );
}
