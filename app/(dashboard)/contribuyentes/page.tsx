import { redirect } from 'next/navigation'

/**
 * La gestión de múltiples contribuyentes se retiró: cada usuario tiene un
 * único contribuyente y lo que cambia es el régimen fiscal, desde
 * /administrador-relaciones.
 *
 * La ruta se conserva como redirección para que un enlace viejo o un favorito
 * no termine en un 404.
 */
export default function ContribuyentesPage() {
  redirect('/administrador-relaciones')
}
