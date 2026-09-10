export type TipoDocumento =
  | "CC"
  | "CE"
  | "Pasaporte"
  | "DNI"
  | "PPT"
  | "PEP"
  | "TI"
  | "Doc. Extranjero";

// Nacionalidad es de tipo abierto (string) porque la lista real vive en
// datos, no en código: sale de mocks/nacionalidades.json y en producción
// vendrá de un endpoint (GET /nacionalidades o similar). Un union literal
// fijo se desincroniza cada vez que se agrega o quita un país del JSON,
// obligando a tocar este archivo a mano. Se mantiene el alias con nombre
// solo por legibilidad semántica en el resto del código.
export type Nacionalidad = string;

export interface UsuarioPerfil {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  tipoDocumento: TipoDocumento | "";
  numeroDocumento: string;
  fechaNacimiento: string;
  nacionalidad: Nacionalidad | "";
  perfilCompleto: boolean;
}

export interface FormEditarPerfil {
  nombres: string;
  apellidos: string;
  telefono: string;
  fechaNacimiento: string;
  nacionalidad: Nacionalidad | "";
}

export interface FormCompletarPerfil {
  nombres: string;
  apellidos: string;
  telefono: string;
  fechaNacimiento: string;
  tipoDocumento: TipoDocumento | "";
  numeroDocumento: string;
  nacionalidad: Nacionalidad | "";
}

export interface FormCambiarCorreo {
  nuevoCorreo: string;
  confirmarCorreo: string;
  contrasenaActual: string;
}

export interface ErroresPerfil {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  fechaNacimiento?: string;
  nacionalidad?: string;
}

export interface ErroresCompletarPerfil {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  fechaNacimiento?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  nacionalidad?: string;
}

export interface ErroresCambiarCorreo {
  nuevoCorreo?: string;
  confirmarCorreo?: string;
  contrasenaActual?: string;
}
