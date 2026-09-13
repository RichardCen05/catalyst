import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { IconEmpty } from "@/components/ui/icons";

export default function NotFound() {
  return <Panel className="mx-auto max-w-xl p-10 text-center"><SearchX aria-hidden="true" className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Halaman tidak ditemukan</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Kode saham atau halaman tidak tersedia dalam data simulasi Catalyst.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Kembali ke Hari ini</Link></Panel>;
}
