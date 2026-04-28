import ContentForm from '../../components/ContentForm'

export default function NewContentPage() {
  return (
    <div className="p-12">
      <div className="mb-10">
        <h1 className="text-[32px] font-medium tracking-[-0.02em] mb-2">
          Crear Nuevo Contenido
        </h1>
        <p className="text-text-secondary text-[16px]">
          Completá los campos para sumar un nuevo contenido al catálogo.
        </p>
      </div>

      <ContentForm />
    </div>
  )
}
