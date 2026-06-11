import { notFound } from 'next/navigation'

// Catch-all для несуществующих адресов: без него Next отдаёт системный 404 без шапки
// и футера сайта. Конкретные роуты (включая /admin и /api из группы (payload)) имеют
// приоритет над этим сегментом.
export default function CatchAllNotFound() {
  notFound()
}
