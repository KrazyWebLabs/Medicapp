interface Props {
  children: React.ReactNode;
}
export default function SubmitBtn({ children }: Props) {
  return (
    <button
      type="submit"
      className="inline-block px-4 min-w-full py-3 mx-2 text-white duration-150 font-medium bg-[#B3DCCE] rounded-md hover:bg-[#5C6B73] active:bg-[#5C6B73] md:text-sm capitalize"
    >
      {children}
    </button>
  );
}
