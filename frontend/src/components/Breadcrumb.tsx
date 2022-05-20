import { styled } from "@stitches/react"
import Link from "next/link"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"

const Nav = styled("nav", {
  display: "flex",
  flexDirection: "row",
})

const Separator = styled("div", {
  padding: "0 0.5rem",
  "&::before": {
    content: "/"
  }
})

const BreadcrumbLink = styled(Link, {
  textDecoration: "none"
})

const Breadcrumb= () => {
  const router = useRouter()
  const [path, setPath] = useState<string[]>([])

  useEffect(() => {
    setPath(router.asPath.split("/"))
  }, [router])

  return (
    <Nav>
      {path.map((link, index) => {
        if (index > 0) {
          let href = path.reduce((previous, current, currentIndex) => {
            if (currentIndex < index - 1) {
              return previous + current
            } else {
              return previous
            }
          })
          let text = link.toUpperCase()

          if (link.substring(0, 2) === "0x" && link.length === 65) {
            text = link.substring(0, 5).concat("…").concat(link.substring(link.length - 3, link.length)).toUpperCase()
          } else if (link === "") {
            text = "START"
          }

          let returnable = <><BreadcrumbLink href={href}>{text}</BreadcrumbLink></>
          if (index < path.length - 1) {
            returnable = <><BreadcrumbLink href={href}>{text}</BreadcrumbLink><Separator /></>
          }
          return returnable
        }
      })}
    </Nav>
  )
}

export default Breadcrumb
