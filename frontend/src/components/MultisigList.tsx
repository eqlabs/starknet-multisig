import Link from "next/link"
import { useSnapshot } from "valtio"
import { state } from "~/state"

const MultisigList = () => {
  const { multisigs } = useSnapshot(state)
  return (
    <>
      {multisigs?.map(contractAddress => (
        <div key={`contractList-${contractAddress}`}>
          <Link href={`/contract/${contractAddress}`}>{contractAddress}</Link>
        </div>
      ))}
    </>
  )
}

export default MultisigList
