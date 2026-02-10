export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-chifle-earth mb-4">
          Mr. Chifles
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Sistema de gestión de ventas
        </p>
        <div className="space-y-4">
          <a
            href="/ventas"
            className="btn btn-primary block w-full max-w-xs mx-auto"
          >
            Iniciar Ventas
          </a>
          <a
            href="/productos"
            className="btn btn-secondary block w-full max-w-xs mx-auto"
          >
            Ver Productos
          </a>
        </div>
      </div>
    </main>
  )
}
