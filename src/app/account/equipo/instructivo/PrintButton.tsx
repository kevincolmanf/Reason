'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-gray-900 text-white px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-gray-700 transition-colors"
    >
      Guardar como PDF / Imprimir
    </button>
  )
}
