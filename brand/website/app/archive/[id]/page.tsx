import { archiveEntries } from '../data'
import ArchiveEntryClient from './client'

export async function generateStaticParams() {
  return archiveEntries.map((entry) => ({
    id: entry.id,
  }))
}

export default function ArchiveEntryPage({ params }: { params: { id: string } }) {
  const entry = archiveEntries.find(e => e.id === params.id)
  
  if (!entry) {
    return <ArchiveEntryClient entry={null} />
  }
  
  return <ArchiveEntryClient entry={entry} />
}