interface Props {
  count: number
  children: string
}

export default function Counter({ count, children }: Props) {
  return (
    <div className="border dark:border-gray-600 rounded-lg p-2 w-fit text-sm">
      <p className="font-bold text-center text-purple-500">
        {count}
      </p>
      {children}
    </div>
  )
}