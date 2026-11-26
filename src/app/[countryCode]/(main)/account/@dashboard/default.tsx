/**
 * Next 16 requires every parallel slot to have a default (#2636). Every
 * account URL has a dashboard page, so this only renders for a route the
 * dashboard slot doesn't define, where the layout shows nothing.
 */
export default function DashboardDefault() {
  return null
}
