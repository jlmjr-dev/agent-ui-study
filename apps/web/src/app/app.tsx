import { Navigate, Route, Routes } from "react-router-dom"

import { Shell } from "./shell"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Shell />} />
      <Route path="/c/:conversationId" element={<Shell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
