import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Lista de correos autorizados para el módulo administrativo
const CORREOS_AUTORIZADOS = [
  'secacademica@orestesindici.edu.co',
  'secacademica1@orestesindici.edu.co',
  'samuel.toasura@orestesindici.edu.co',
];

// Función para poner la primera letra de cada palabra en mayúscula (excepto correos)
const capitalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function App() {
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [intentadoAvanzar, setIntentadoAvanzar] = useState(false);

  // MODO ADMINISTRACIÓN Y AUTENTICACIÓN GOOGLE
  const [vistaAdmin, setVistaAdmin] = useState(false);
  const [autenticadoAdmin, setAutenticadoAdmin] = useState(false);
  const [usuarioAdmin, setUsuarioAdmin] = useState<any>(null);
  const [registros, setRegistros] = useState<any[]>([]);
  const [filtroGrado, setFiltroGrado] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [estudiantesAImprimir, setEstudiantesAImprimir] = useState<any[]>([]);

  // Estado del Formulario
  const [formData, setFormData] = useState({
    sede: 'ORESTE SINDICI',
    lugar_fecha_inscripcion: 'Nilo, ' + new Date().toLocaleDateString('es-CO'),
    folio_no: '',
    matricula_no: '',
    vigencia: '2027',
    grado: '',
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    tipo_identificacion: 'TI',
    numero_identificacion: '',
    lugar_expedicion: '',
    fecha_nacimiento: '',
    lugar_nacimiento: '',
    edad: '',
    genero: 'M',
    tipo_sangre_rh: '',
    municipio_residencia: 'Nilo',
    barrio_residencia: '',
    direccion_residencia: '',
    telefono: '',
    correo_electronico: '',
    eps: '',
    sisben: '',
    tipo_discapacidad: 'Ninguna',
    historia_academica: {} as Record<string, string>,
    ruta_escolar: 'NO',
    padre_nombres: '',
    padre_tipo_doc: 'CC',
    padre_num_doc: '',
    padre_telefono: '',
    padre_direccion: '',
    madre_nombres: '',
    madre_tipo_doc: 'CC',
    madre_num_doc: '',
    madre_telefono: '',
    madre_direccion: '',
    acudiente_nombres: '',
    acudiente_parentesco: '',
    acudiente_tipo_doc: 'CC',
    acudiente_num_doc: '',
    acudiente_telefono: '',
    acudiente_direccion: '',
    acudiente_correo: '',
    acudiente_custodia: 'SI',
  });

  // ESCUCHADOR DE AUTENTICACIÓN GOOGLE SUPABASE
  useEffect(() => {
    const verificarSesion = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        validarYAutorizarUsuario(session.user);
      }
    };

    verificarSesion();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          validarYAutorizarUsuario(session.user);
        } else {
          setAutenticadoAdmin(false);
          setUsuarioAdmin(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const validarYAutorizarUsuario = async (user: any) => {
    const emailUsuario = (user.email || '').toLowerCase();
    const esAutorizado = CORREOS_AUTORIZADOS.some(
      (correo) => correo.toLowerCase() === emailUsuario
    );

    if (esAutorizado) {
      setUsuarioAdmin(user);
      setAutenticadoAdmin(true);
      setVistaAdmin(true);
      setErrorMsg('');
    } else {
      await supabase.auth.signOut();
      setAutenticadoAdmin(false);
      setUsuarioAdmin(null);
      setVistaAdmin(false);
      setErrorMsg(
        `El correo ${emailUsuario} no tiene permisos de administración.`
      );
    }
  };

  const handleLoginGoogle = async () => {
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(`Error al iniciar sesión con Google: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAutenticadoAdmin(false);
    setUsuarioAdmin(null);
    setVistaAdmin(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleHistoriaChange = (gradoKey: string, colegio: string) => {
    setFormData({
      ...formData,
      historia_academica: {
        ...formData.historia_academica,
        [gradoKey]: colegio,
      },
    });
  };

  // REGLA EXACTA DE GRADOS ANTERIORES
  const obtenerGradosAnteriores = (gradoSeleccionado: string) => {
    if (!gradoSeleccionado) return [];
    const match = gradoSeleccionado.match(/\d+/);
    if (!match) return [];
    const numeroGrado = parseInt(match[0], 10);
    if (numeroGrado === 0) return [];

    const inicio = numeroGrado >= 6 ? 5 : 0;
    const grados = [];
    for (let i = inicio; i < numeroGrado; i++) {
      grados.push(i);
    }
    return grados;
  };

  const cargarRegistros = async () => {
    setCargando(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('Matricula 2027')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (err: any) {
      setErrorMsg(`Error al obtener registros: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (autenticadoAdmin) {
      cargarRegistros();
    }
  }, [autenticadoAdmin]);

  // Validación de campos por paso
  const validarPasoActual = async (pasoAValidar: number): Promise<boolean> => {
    setIntentadoAvanzar(true);
    setErrorMsg('');

    if (pasoAValidar === 1) {
      if (
        !formData.sede ||
        !formData.grado ||
        !formData.primer_nombre ||
        !formData.primer_apellido ||
        !formData.tipo_identificacion ||
        !formData.numero_identificacion ||
        !formData.fecha_nacimiento ||
        !formData.lugar_nacimiento ||
        !formData.edad ||
        !formData.genero ||
        !formData.tipo_sangre_rh
      ) {
        setErrorMsg(
          'Por favor diligencie todos los campos obligatorios (*) marcados.'
        );
        return false;
      }

      // Verificación de duplicidad en Supabase
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('Matricula 2027')
          .select('id, numero_identificacion')
          .eq('numero_identificacion', formData.numero_identificacion)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setErrorMsg(
            '⚠️ Este documento ya se encuentra registrado. La matrícula ya fue diligenciada.'
          );
          setCargando(false);
          return false;
        }
      } catch (err: any) {
        setErrorMsg(`Error al verificar documento: ${err.message}`);
        setCargando(false);
        return false;
      } finally {
        setCargando(false);
      }
    }

    if (pasoAValidar === 2) {
      if (
        !formData.municipio_residencia ||
        !formData.barrio_residencia ||
        !formData.direccion_residencia ||
        !formData.telefono ||
        !formData.eps ||
        !formData.tipo_discapacidad
      ) {
        setErrorMsg(
          'Por favor diligencie todos los campos obligatorios (*) marcados.'
        );
        return false;
      }
    }

    if (pasoAValidar === 3) {
      const gradosAnteriores = obtenerGradosAnteriores(formData.grado);
      for (const gNum of gradosAnteriores) {
        const colegio = formData.historia_academica[`grado_${gNum}`];
        if (!colegio || colegio.trim() === '') {
          setErrorMsg(
            'Por favor diligencie la institución educativa para todos los grados del historial académico (*).'
          );
          return false;
        }
      }
    }

    if (pasoAValidar === 4) {
      if (
        !formData.acudiente_nombres ||
        !formData.acudiente_parentesco ||
        !formData.acudiente_custodia ||
        !formData.acudiente_tipo_doc ||
        !formData.acudiente_num_doc ||
        !formData.acudiente_telefono ||
        !formData.acudiente_correo ||
        !formData.acudiente_direccion
      ) {
        setErrorMsg(
          'Por favor diligencie TODOS los campos obligatorios (*) de los Datos del Acudiente.'
        );
        return false;
      }
    }

    setIntentadoAvanzar(false);
    return true;
  };

  // Cambio manual mediante clic en pestañas con validación
  const handleCambioPestana = async (destino: number) => {
    if (destino === paso) return;
    if (destino < paso) {
      setErrorMsg('');
      setPaso(destino);
    } else {
      const esValido = await validarPasoActual(paso);
      if (esValido) {
        setPaso(destino);
      }
    }
  };

  // Siguiente paso desde botón
  const handleSiguientePaso = async (e: React.FormEvent) => {
    e.preventDefault();
    const esValido = await validarPasoActual(paso);
    if (!esValido) return;

    if (paso < 4) {
      setPaso(paso + 1);
    }
  };

  // Función explícita para guardar el formulario final
  const handleGuardarFinal = async () => {
    const esValido = await validarPasoActual(4);
    if (!esValido) return;

    setCargando(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        fecha_nacimiento: formData.fecha_nacimiento || null,
      };

      const { error } = await supabase.from('Matricula 2027').insert([payload]);

      if (error) {
        console.error('Error de Supabase:', error);
        setErrorMsg(`Supabase Error [${error.code}]: ${error.message} (${error.details || error.hint || 'Sin detalles'})`);
        return;
      }

      setCompletado(true);
    } catch (err: any) {
      console.error('Error general:', err);
      const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : JSON.stringify(err));
      setErrorMsg(`Error al procesar el guardado: ${msg}`);
    } finally {
      setCargando(false);
    }
  };

  const registrosFiltrados = registros.filter((est) => {
    if (!est) return false;
    const numEstudiante = (est.grado || '').toString().match(/\d+/)?.[0];
    const numFiltro = filtroGrado ? filtroGrado.match(/\d+/)?.[0] : null;

    const coincideGrado = numFiltro ? numEstudiante === numFiltro : true;
    const textoCompleto = `${est.primer_nombre || ''} ${
      est.primer_apellido || ''
    } ${est.numero_identificacion || ''}`.toLowerCase();
    const coincideTexto = busquedaTexto
      ? textoCompleto.includes(busquedaTexto.toLowerCase())
      : true;

    return coincideGrado && coincideTexto;
  });

  const lanzarImpresion = (estudiantes: any[]) => {
    setEstudiantesAImprimir(estudiantes);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Helper para generar estilo dinámico de campos obligatorios vacíos
  const getDynamicInputStyle = (
    value: string | undefined,
    isRequired: boolean
  ) => {
    const estaVacio = isRequired && (!value || value.toString().trim() === '');
    const mostrarError = intentadoAvanzar && estaVacio;

    return {
      ...inputStyle,
      borderColor: mostrarError ? '#ef4444' : '#cbd5e1',
      backgroundColor: mostrarError ? '#fef2f2' : '#ffffff',
      color: '#111827',
    };
  };

  // VISTA PREVIA E IMPRESIÓN DE FICHA
  if (estudiantesAImprimir.length > 0) {
    return (
      <div
        style={{
          padding: '2px',
          fontFamily: "'Arial', sans-serif",
          maxWidth: '800px',
          margin: '0 auto',
          background: '#fff',
        }}
      >
        <div
          style={{ marginBottom: '8px', display: 'flex', gap: '10px' }}
          className="no-print"
        >
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 16px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🖨️ Imprimir / Descargar PDF ({estudiantesAImprimir.length} Ficha/s)
          </button>
          <button
            onClick={() => setEstudiantesAImprimir([])}
            style={{
              padding: '8px 16px',
              background: '#64748b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ✖ Cerrar Vista Previa
          </button>
        </div>

        {estudiantesAImprimir.map((est, idx) => {
          const gradosAmostrar = obtenerGradosAnteriores(est.grado || '');
          const historiaJson = est.historia_academica || {};

          return (
            <div
              key={est.id || idx}
              className="hoja-pdf"
              style={{
                border: '1.5px solid #000',
                padding: '3px 5px',
                boxSizing: 'border-box',
                background: '#fff',
              }}
            >
              {/* ENCABEZADO */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'center',
                  marginBottom: '2px',
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '0px',
                        width: '15%',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      <img
                        src="/Escudo Colombia.jpg"
                        alt="Escudo Colombia"
                        style={{
                          maxHeight: '127px',
                          maxWidth: '132px',
                          objectFit: 'contain',
                        }}
                      />
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '1px',
                        width: '70%',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          fontStyle: 'italic',
                          color: '#000',
                        }}
                      >
                        Institución Educativa Departamental Oreste Síndici
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          fontStyle: 'italic',
                          margin: '0.5px 0',
                        }}
                      >
                        Nilo Cundinamarca.
                      </div>
                      <div
                        style={{
                          fontSize: '7px',
                          fontWeight: 'bold',
                          lineHeight: '1.1',
                        }}
                      >
                        Res. N°003313 del 30/09/2002, Res. N°002215 del
                        11/06/2004,Res. N°009245 del 15/12/2016 y Res. N°004492
                        del 18/07/2019. NIT: 808.000.763-2 • DANE: 125488000133
                        • ICFES: 748814
                      </div>
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 'bold',
                          fontStyle: 'italic',
                          marginTop: '1px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                        }}
                      >
                        FICHA DE MATRÍCULA ESCOLAR
                      </div>
                    </td>
                    <td
                      style={{
                        border: '1px solid #000',
                        padding: '0px',
                        width: '15%',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      <img
                        src="/escudo.png"
                        alt="Escudo Colegio"
                        style={{
                          maxHeight: '66px',
                          maxWidth: '62px',
                          objectFit: 'contain',
                        }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 1. USO INSTITUCIONAL */}
              <table style={pdfTableStyle}>
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <tbody>
                  <tr style={bgHeaderStyle}>
                    <td colSpan={6}>USO INSTITUCIONAL</td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td>SEDE</td>
                    <td>FECHA DE INSCRIPCIÓN</td>
                    <td>FOLIO N°</td>
                    <td>MATRICULA N°</td>
                    <td>SE MATRICULA EN EL GRADO:</td>
                    <td>VIGENCIA</td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, fontWeight: 'bold' }}>
                      {capitalizeText(est.sede)}
                    </td>
                    <td style={{ ...tdValueStyle }}>
                      {capitalizeText(est.lugar_fecha_inscripcion)}
                    </td>
                    <td style={{ ...tdValueStyle }}>{est.folio_no}</td>
                    <td style={{ ...tdValueStyle }}>{est.matricula_no}</td>
                    <td style={{ ...tdValueStyle, fontWeight: 'bold' }}>
                      {capitalizeText(est.grado)}
                    </td>
                    <td style={{ ...tdValueStyle }}>{est.vigencia}</td>
                  </tr>
                </tbody>
              </table>

              {/* 2. INFORMACIÓN DEL ALUMNO */}
              <table style={pdfTableStyle}>
                <tbody>
                  <tr style={bgHeaderStyle}>
                    <td colSpan={1}>INFORMACION DEL ALUMNO</td>
                  </tr>
                </tbody>
              </table>

              <table style={pdfTableStyle}>
                <tbody>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '25%' }}>PRIMER NOMBRE</td>
                    <td style={{ width: '25%' }}>SEGUNDO NOMBRE</td>
                    <td style={{ width: '25%' }}>PRIMER APELLIDO</td>
                    <td style={{ width: '25%' }}>SEGUNDO APELLIDO</td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {capitalizeText(est.primer_nombre)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {capitalizeText(est.segundo_nombre)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {capitalizeText(est.primer_apellido)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {capitalizeText(est.segundo_apellido)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style={pdfTableStyle}>
                <tbody>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '20%' }}>TIPO DE IDENTIFICACION</td>
                    <td style={{ width: '20%' }}>NUMERO DE IDENTIFICACION</td>
                    <td style={{ width: '45%' }}>
                      MUNICIPIO Y DEPARTAMENTO DE EXPEDICIÓN
                    </td>
                    <td style={{ width: '15%' }}>EDAD</td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.tipo_identificacion}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.numero_identificacion}
                    </td>
                    <td style={{ ...tdValueStyle, width: '45%' }}>
                      {capitalizeText(est.lugar_expedicion)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '15%' }}>
                      {est.edad} AÑOS
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style={pdfTableStyle}>
                <tbody>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '25%' }}>FECHA DE NACIMIENTO</td>
                    <td style={{ width: '45%' }}>
                      MUNICIPIO Y DEPARTAMENTO DE NACIMIENTO
                    </td>
                    <td style={{ width: '15%' }}>GENERO</td>
                    <td style={{ width: '15%' }}>TIPO DE SANGRE Y RH</td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {est.fecha_nacimiento}
                    </td>
                    <td style={{ ...tdValueStyle, width: '45%' }}>
                      {capitalizeText(est.lugar_nacimiento)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '15%' }}>
                      {est.genero}
                    </td>
                    <td style={{ ...tdValueStyle, width: '15%' }}>
                      {est.tipo_sangre_rh}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 3. UBICACIÓN DEL ALUMNO */}
              <table style={pdfTableStyle}>
                <tbody>
                  <tr style={bgHeaderStyle}>
                    <td colSpan={4}>UBICACIÓN DEL ALUMNO</td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '25%' }}>MUNICIPIO DE RESIDENCIA</td>
                    <td style={{ width: '25%' }}>BARRIO RESIDENCIA</td>
                    <td colSpan={2} style={{ width: '50%' }}>
                      DIRECCION DE RESIDENCIA
                    </td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {capitalizeText(est.municipio_residencia)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {capitalizeText(est.barrio_residencia)}
                    </td>
                    <td colSpan={2} style={{ ...tdValueStyle, width: '50%' }}>
                      {capitalizeText(est.direccion_residencia)}
                    </td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '50%' }}>CORREO ELECTRONICO</td>
                    <td style={{ width: '18%' }}>EPS</td>
                    <td style={{ width: '16%' }}>SISBEN</td>
                    <td style={{ width: '16%' }}>TELEFONO</td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '50%' }}>
                      {est.correo_electronico
                        ? est.correo_electronico.toLowerCase()
                        : ''}
                    </td>
                    <td style={{ ...tdValueStyle, width: '18%' }}>
                      {capitalizeText(est.eps)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '16%' }}>
                      {est.sisben}
                    </td>
                    <td style={{ ...tdValueStyle, width: '16%' }}>
                      {est.telefono}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...tdSubLabelStyle, width: '25%' }}>
                      TIPO DE DISCAPACIDAD:
                    </td>
                    <td colSpan={3} style={{ ...tdValueStyle, width: '75%' }}>
                      {capitalizeText(est.tipo_discapacidad)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 4. HISTORIA ACADEMICA DEL ALUMNO */}
              <table style={pdfTableStyle}>
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '80%' }} />
                </colgroup>
                <tbody>
                  <tr style={bgHeaderStyle}>
                    <td colSpan={2}>HISTORIA ACADEMICA DEL ALUMNO</td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ textAlign: 'center' }}>GRADO</td>
                    <td style={{ textAlign: 'center' }}>
                      INSTITUCION EDUCATIVA
                    </td>
                  </tr>
                  {gradosAmostrar.length === 0 ? (
                    <tr>
                      <td
                        style={{
                          ...tdValueStyle,
                          textAlign: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        -
                      </td>
                      <td style={{ ...tdValueStyle, fontStyle: 'italic' }}>
                        Ingresa a {capitalizeText(est.grado)} (No requiere
                        registro de grados anteriores)
                      </td>
                    </tr>
                  ) : (
                    gradosAmostrar.map((gNum) => (
                      <tr key={gNum}>
                        <td
                          style={{
                            ...tdValueStyle,
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          {gNum}
                        </td>
                        <td style={{ ...tdValueStyle }}>
                          {capitalizeText(
                            historiaJson[`grado_${gNum}`] || 'MISMA INSTITUCIÓN'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr>
                    <td style={{ ...tdSubLabelStyle, textAlign: 'center' }}>
                      RUTA ESCOLAR
                    </td>
                    <td style={{ ...tdValueStyle }}>
                      <span
                        style={{
                          display: 'inline-block',
                          border: '1px solid #000',
                          padding: '0 2px',
                          marginRight: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        {est.ruta_escolar === 'SI' ? 'X' : ' '}
                      </span>{' '}
                      SI &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <span
                        style={{
                          display: 'inline-block',
                          border: '1px solid #000',
                          padding: '0 2px',
                          marginRight: '4px',
                          fontWeight: 'bold',
                        }}
                      >
                        {est.ruta_escolar !== 'SI' ? 'X' : ' '}
                      </span>{' '}
                      NO
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 5. INFORMACION DE FAMILIARES */}
              <table style={pdfTableStyle}>
                <tbody>
                  <tr style={bgHeaderStyle}>
                    <td colSpan={5}>
                      INFORMACION DE FAMILIARES (PADRES - MADRE Y/O ACUDIENTES)
                    </td>
                  </tr>

                  {/* PADRE */}
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '15%' }}>PARENTESCO</td>
                    <td colSpan={4} style={{ width: '85%' }}>
                      NOMBRES Y APELLIDOS (PADRE)
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        ...tdValueStyle,
                        fontWeight: 'bold',
                        width: '15%',
                      }}
                    >
                      PADRE
                    </td>
                    <td colSpan={4} style={{ ...tdValueStyle, width: '85%' }}>
                      {capitalizeText(est.padre_nombres)}
                    </td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '15%' }}>TIPO DE IDENTIFICACION</td>
                    <td style={{ width: '20%' }}>NUMERO DE IDENTIFICACION</td>
                    <td style={{ width: '20%' }}>TELEFONO CELULAR</td>
                    <td colSpan={2} style={{ width: '45%' }}>
                      DIRECCIÓN DE RESIDENCIA
                    </td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '15%' }}>
                      {est.padre_tipo_doc}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.padre_num_doc}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.padre_telefono}
                    </td>
                    <td colSpan={2} style={{ ...tdValueStyle, width: '45%' }}>
                      {capitalizeText(est.padre_direccion)}
                    </td>
                  </tr>

                  {/* MADRE */}
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '15%' }}>PARENTESCO</td>
                    <td colSpan={4} style={{ width: '85%' }}>
                      NOMBRES Y APELLIDOS (MADRE)
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        ...tdValueStyle,
                        fontWeight: 'bold',
                        width: '15%',
                      }}
                    >
                      MADRE
                    </td>
                    <td colSpan={4} style={{ ...tdValueStyle, width: '85%' }}>
                      {capitalizeText(est.madre_nombres)}
                    </td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '15%' }}>TIPO DE IDENTIFICACION</td>
                    <td style={{ width: '20%' }}>NUMERO DE IDENTIFICACION</td>
                    <td style={{ width: '20%' }}>TELEFONO CELULAR</td>
                    <td colSpan={2} style={{ width: '45%' }}>
                      DIRECCIÓN DE RESIDENCIA
                    </td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '15%' }}>
                      {est.madre_tipo_doc}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.madre_num_doc}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.madre_telefono}
                    </td>
                    <td colSpan={2} style={{ ...tdValueStyle, width: '45%' }}>
                      {capitalizeText(est.madre_direccion)}
                    </td>
                  </tr>

                  {/* ACUDIENTE */}
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '15%' }}>PARENTESCO</td>
                    <td colSpan={3} style={{ width: '65%' }}>
                      NOMBRES Y APELLIDOS (ACUDIENTE) AUTORIZACIÓN Y/O CUSTODIA.
                    </td>
                    <td style={{ width: '20%' }}>AUTORIZACIÓN/ CUSTODIA</td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        ...tdValueStyle,
                        fontWeight: 'bold',
                        width: '15%',
                      }}
                    >
                      {capitalizeText(est.acudiente_parentesco) || 'ACUDIENTE'}
                    </td>
                    <td colSpan={3} style={{ ...tdValueStyle, width: '65%' }}>
                      {capitalizeText(est.acudiente_nombres)}
                    </td>
                    <td
                      style={{
                        ...tdValueStyle,
                        textAlign: 'center',
                        fontWeight: 'bold',
                        width: '20%',
                      }}
                    >
                      {est.acudiente_custodia || 'SI'}
                    </td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '15%' }}>TIPO DE IDENTIFICACION</td>
                    <td style={{ width: '20%' }}>NUMERO DE IDENTIFICACION</td>
                    <td style={{ width: '20%' }}>TELEFONO CELULAR</td>
                    <td style={{ width: '25%' }}>DIRECCIÓN DE RESIDENCIA</td>
                    <td style={{ width: '20%' }}>CORREO ELECTRONICO</td>
                  </tr>
                  <tr style={{ textAlign: 'center' }}>
                    <td style={{ ...tdValueStyle, width: '15%' }}>
                      {est.acudiente_tipo_doc}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.acudiente_num_doc}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.acudiente_telefono}
                    </td>
                    <td style={{ ...tdValueStyle, width: '25%' }}>
                      {capitalizeText(est.acudiente_direccion)}
                    </td>
                    <td style={{ ...tdValueStyle, width: '20%' }}>
                      {est.acudiente_correo
                        ? est.acudiente_correo.toLowerCase()
                        : ''}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* COMPROMISO INSTITUCIONAL */}
              <div
                style={{
                  marginTop: '2px',
                  fontSize: '7px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  lineHeight: '1.1',
                }}
              >
                *Al firmar la presente matrícula, tanto los estudiantes como los
                padres de familia, nos comprometemos a cumplir los principios
                Oreste Sindici, respetar la filosofía del colegio y acatar todo
                lo estipulado en el Manual de Convivencia y el Sistema
                Institucional de Evaluación de Estudiantes (SIEE).
              </div>

              {/* 4 FIRMAS OFICIALES */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginTop: '2px',
                  textAlign: 'center',
                }}
              >
                <tbody>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '50%', padding: '1px' }}>
                      NOMBRE Y FIRMA DEL ESTUDIANTE
                    </td>
                    <td style={{ width: '50%', padding: '1px' }}>
                      NOMBRE Y FIRMA DEL PADRE Y/O MADRE Y/O ACUDIENTE
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{ border: '1px solid #000', height: '24px' }}
                    ></td>
                    <td
                      style={{ border: '1px solid #000', height: '24px' }}
                    ></td>
                  </tr>
                  <tr style={thSubHeaderStyle}>
                    <td style={{ width: '50%', padding: '1px' }}>
                      NOMBRE Y FIRMA DE RECTOR (A)
                    </td>
                    <td style={{ width: '50%', padding: '1px' }}>
                      NOMBRE Y FIRMA DE SECRETARIO (A)
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{ border: '1px solid #000', height: '24px' }}
                    ></td>
                    <td
                      style={{ border: '1px solid #000', height: '24px' }}
                    ></td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* REGLAS CSS DE IMPRESIÓN */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            @page {
              size: letter portrait;
              margin: 3mm;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .hoja-pdf {
              page-break-after: always;
              page-break-inside: avoid;
              border: 1.5px solid #000 !important;
              padding: 3px 5px !important;
              box-sizing: border-box;
              zoom: 0.85;
              width: 100%;
            }
          }
        `}</style>
      </div>
    );
  }

  // VISTA PANEL DE ADMINISTRACIÓN
  if (vistaAdmin) {
    if (!autenticadoAdmin) {
      return (
        <div
          style={{
            maxWidth: '420px',
            margin: '80px auto',
            padding: '28px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            fontFamily: 'sans-serif',
            textAlign: 'center',
          }}
        >
          <img
            src="/escudo1.png"
            alt="Escudo Colegio"
            style={{
              height: '70px',
              objectFit: 'contain',
              marginBottom: '12px',
            }}
          />
          <h3
            style={{
              color: '#16a34a',
              margin: '0 0 8px',
              fontSize: '18px',
            }}
          >
            Módulo Administrativo
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              marginBottom: '20px',
              lineHeight: '1.4',
            }}
          >
            Inicie sesión con su cuenta institucional de Google autorizada para
            acceder al panel de matrículas.
          </p>

          {errorMsg && (
            <div
              style={{
                padding: '10px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleLoginGoogle}
            style={{
              width: '100%',
              padding: '12px',
              background: '#fff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.71L.97 13.04C2.45 15.98 5.48 18 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.87 10.81c-.18-.53-.28-1.09-.28-1.81s.1-1.28.28-1.81L.97 4.96C.35 6.18 0 7.55 0 9s.35 2.82.97 4.04l2.9-2.23z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.23C4.59 5.05 6.62 3.58 9 3.58z"
              />
            </svg>
            Continuar con Google
          </button>

          <button
            type="button"
            onClick={() => setVistaAdmin(false)}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '10px',
              background: '#e2e8f0',
              color: '#334155',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            Volver
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          maxWidth: '900px',
          margin: '20px auto',
          padding: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid #cbd5e1',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '2px solid #f1f5f9',
            paddingBottom: '12px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: '#16a34a' }}>
              Gestión de Matrículas 2027
            </h2>
            <span
              style={{ fontSize: '12px', color: '#16a34a', fontWeight: 'bold' }}
            >
              Usuario: {usuarioAdmin?.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5 bg-slate-50 p-3 rounded-lg">
          <div>
            <label style={labelStyle}>Filtrar por Grado</label>
            <select
              value={filtroGrado}
              onChange={(e) => setFiltroGrado(e.target.value)}
              style={getDynamicInputStyle(filtroGrado, false)}
            >
              <option value="">
                -- Todos los Grados ({registros.length}) --
              </option>
              {[...Array(12)].map((_, i) => (
                <option key={i} value={`Grado ${i}`}>
                  Grado {i}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label style={labelStyle}>Buscar Estudiante / Documento</label>
            <input
              type="text"
              placeholder="Nombre o Número de Documento..."
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              disabled={registrosFiltrados.length === 0}
              onClick={() => lanzarImpresion(registrosFiltrados)}
              style={{
                width: '100%',
                padding: '9px',
                background:
                  registrosFiltrados.length === 0 ? '#cbd5e1' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🖨️ Imprimir Grupo ({registrosFiltrados.length})
            </button>
          </div>
        </div>

        {cargando ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>
            Cargando registros desde Supabase...
          </p>
        ) : registrosFiltrados.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: '8px',
            }}
          >
            No se encontraron registros que coincidan con el filtro.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: '#16a34a',
                    color: '#fff',
                    textAlign: 'left',
                  }}
                >
                  <th style={thTableStyle}>Grado</th>
                  <th style={thTableStyle}>Estudiante</th>
                  <th style={thTableStyle}>Documento</th>
                  <th style={thTableStyle}>Acudiente / Tel.</th>
                  <th style={thTableStyle}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((est) => (
                  <tr
                    key={est.id}
                    style={{ borderBottom: '1px solid #e2e8f0' }}
                  >
                    <td style={tdTableStyle}>
                      <strong>{capitalizeText(est.grado)}</strong>
                    </td>
                    <td style={tdTableStyle}>
                      {capitalizeText(
                        `${est.primer_nombre} ${est.segundo_nombre || ''} ${
                          est.primer_apellido
                        } ${est.segundo_apellido || ''}`
                      )}
                    </td>
                    <td style={tdTableStyle}>
                      {est.tipo_identificacion}: {est.numero_identificacion}
                    </td>
                    <td style={tdTableStyle}>
                      {capitalizeText(est.acudiente_nombres)} (
                      {est.acudiente_telefono})
                    </td>
                    <td style={tdTableStyle}>
                      <button
                        onClick={() => lanzarImpresion([est])}
                        style={{
                          padding: '6px 12px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}
                      >
                        🖨️ Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // PANTALLA DE CONFIRMACIÓN TRAS GUARDAR MATRÍCULA
  if (completado) {
    return (
      <div
        style={{
          maxWidth: '650px',
          margin: '50px auto',
          padding: '30px',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ color: '#16a34a', margin: '0 0 10px' }}>
          ¡Matrícula Guardada Exitosamente!
        </h2>
        <p style={{ color: '#475569', fontSize: '15px' }}>
          La ficha del estudiante{' '}
          <strong>
            {capitalizeText(
              `${formData.primer_nombre} ${formData.primer_apellido}`
            )}
          </strong>{' '}
          ha sido almacenada correctamente en la tabla{' '}
          <code>Matricula 2027</code>.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <button
            onClick={() => lanzarImpresion([formData])}
            style={{
              padding: '12px 20px',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            📄 Ver y Descargar PDF Ficha
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 20px',
              backgroundColor: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Diligenciar Otra Matrícula
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '780px',
        margin: '20px auto',
        padding: '24px',
        fontFamily: 'sans-serif',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '5px solid #facc15',
          paddingBottom: '16px',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: '#64748b',
              fontSize: '12px',
              textTransform: 'uppercase',
            }}
          >
            Institución Educativa Departamental Oreste Síndici
          </h3>
          <h2 style={{ margin: '4px 0 0', color: '#16a34a', fontSize: '20px' }}>
            Ficha de Matrícula Escolar 2027
          </h2>
        </div>
        <img
          src="/escudo1.png"
          alt="Escudo Colegio"
          style={{ height: '105px', objectFit: 'contain' }}
        />
        <button
          onClick={() => setVistaAdmin(true)}
          style={{
            padding: '8px 14px',
            background: '#f1f5f9',
            color: '#16a34a',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Acceso Docentes / Admin
        </button>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN CONTROLADAS Y VALIDADAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 bg-slate-50 p-2 rounded-lg">
        {[
          { id: 1, label: '1. Alumno' },
          { id: 2, label: '2. Ubicación' },
          { id: 3, label: '3. Historial' },
          { id: 4, label: '4. Acudientes' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleCambioPestana(item.id)}
            style={{
              border: 'none',
              background: paso === item.id ? '#16a34a' : 'transparent',
              color: paso === item.id ? '#fff' : '#64748b',
              padding: '10px 4px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* FORMULARIO PRINCIPAL */}
      <form onSubmit={handleSiguientePaso}>
        {paso === 1 && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <h4 style={sectionHeaderStyle}>
              Uso Institucional y Datos del Alumno
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-100 p-3 rounded-lg">
              <div>
                <label style={labelStyle}>
                  Sede <span style={requiredStarStyle}>*</span>
                </label>
                <select
                  name="sede"
                  required
                  value={formData.sede}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.sede, true)}
                >
                  <option value="ORESTE SINDICI">1. Oreste Sindici</option>
                  <option value="POLICARPA SALAVARRIETA">
                    2. Policarpa Salavarrieta
                  </option>
                  <option value="RURAL SONORA">3. Rural Sonora</option>
                  <option value="RURAL MALACHI">4. Rural Malachi</option>
                  <option value="RURAL BELÉN">5. Rural Belén</option>
                  <option value="RURAL BELLAVISTA">6. Rural Bellavista</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Folio N°</label>
                <input
                  type="text"
                  name="folio_no"
                  value={formData.folio_no}
                  readOnly
                  disabled
                  placeholder="(Reservado Admin)"
                  style={{
                    ...inputStyle,
                    background: '#e2e8f0',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Matrícula N°</label>
                <input
                  type="text"
                  name="matricula_no"
                  value={formData.matricula_no}
                  readOnly
                  disabled
                  placeholder="(Reservado Admin)"
                  style={{
                    ...inputStyle,
                    background: '#e2e8f0',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
              <div>
                <label style={labelStyle}>Vigencia</label>
                <input
                  type="text"
                  name="vigencia"
                  value="2027"
                  readOnly
                  disabled
                  style={{
                    ...inputStyle,
                    background: '#e2e8f0',
                    cursor: 'not-allowed',
                    fontWeight: 'bold',
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Fecha de Inscripción</label>
                <input
                  type="text"
                  name="lugar_fecha_inscripcion"
                  placeholder="Ej: Nilo, 15/01/2027"
                  value={formData.lugar_fecha_inscripcion}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Se Matricula en el Grado{' '}
                  <span style={requiredStarStyle}>*</span>
                </label>
                <select
                  name="grado"
                  required
                  value={formData.grado}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.grado, true)}
                >
                  <option value="">-- Seleccionar Grado --</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i} value={`Grado ${i}`}>
                      Grado {i}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>
                  Primer Nombre <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="primer_nombre"
                  required
                  value={formData.primer_nombre}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.primer_nombre, true)}
                />
              </div>
              <div>
                <label style={labelStyle}>Segundo Nombre</label>
                <input
                  type="text"
                  name="segundo_nombre"
                  value={formData.segundo_nombre}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>
                  Primer Apellido <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="primer_apellido"
                  required
                  value={formData.primer_apellido}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.primer_apellido, true)}
                />
              </div>
              <div>
                <label style={labelStyle}>Segundo Apellido</label>
                <input
                  type="text"
                  name="segundo_apellido"
                  value={formData.segundo_apellido}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label style={labelStyle}>
                  Tipo Identificación <span style={requiredStarStyle}>*</span>
                </label>
                <select
                  name="tipo_identificacion"
                  required
                  value={formData.tipo_identificacion}
                  onChange={handleChange}
                  style={getDynamicInputStyle(
                    formData.tipo_identificacion,
                    true
                  )}
                >
                  <option value="RC">Registro Civil</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="CC">Cédula Ciudadanía</option>
                  <option value="CE">Cédula Extranjería</option>
                  <option value="PPT">PPT</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  Número de Identificación{' '}
                  <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="numero_identificacion"
                  required
                  value={formData.numero_identificacion}
                  onChange={handleChange}
                  style={getDynamicInputStyle(
                    formData.numero_identificacion,
                    true
                  )}
                />
              </div>
              <div>
                <label style={labelStyle}>Lugar de Expedición</label>
                <input
                  type="text"
                  name="lugar_expedicion"
                  placeholder="Municipio/Depto"
                  value={formData.lugar_expedicion}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label style={labelStyle}>
                  Fecha Nacimiento <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  required
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.fecha_nacimiento, true)}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Lugar Nacimiento <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="lugar_nacimiento"
                  required
                  placeholder="Municipio/Depto"
                  value={formData.lugar_nacimiento}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.lugar_nacimiento, true)}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Edad <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="edad"
                  required
                  value={formData.edad}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.edad, true)}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Género <span style={requiredStarStyle}>*</span>
                </label>
                <select
                  name="genero"
                  required
                  translate="no"
                  value={formData.genero}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.genero, true)}
                >
                  <option value="M">Masculino (M)</option>
                  <option value="F">Femenino (F)</option>
                  <option value="No binario">No binario</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  Sangre / RH <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="tipo_sangre_rh"
                  required
                  value={formData.tipo_sangre_rh}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.tipo_sangre_rh, true)}
                />
              </div>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <h4 style={sectionHeaderStyle}>Ubicación del Alumno y Salud</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>
                  Municipio Residencia <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="municipio_residencia"
                  required
                  value={formData.municipio_residencia}
                  onChange={handleChange}
                  style={getDynamicInputStyle(
                    formData.municipio_residencia,
                    true
                  )}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Barrio / Vereda <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="barrio_residencia"
                  required
                  value={formData.barrio_residencia}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.barrio_residencia, true)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label style={labelStyle}>
                  Dirección de Residencia{' '}
                  <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="direccion_residencia"
                  required
                  value={formData.direccion_residencia}
                  onChange={handleChange}
                  style={getDynamicInputStyle(
                    formData.direccion_residencia,
                    true
                  )}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Teléfono Celular <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="telefono"
                  required
                  value={formData.telefono}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.telefono, true)}
                />
              </div>
              <div>
                <label style={labelStyle}>Correo Electrónico Alumno</label>
                <input
                  type="email"
                  name="correo_electronico"
                  value={formData.correo_electronico}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label style={labelStyle}>
                  EPS <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="eps"
                  required
                  value={formData.eps}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.eps, true)}
                />
              </div>
              <div>
                <label style={labelStyle}>SISBÉN (Grupo / Nivel)</label>
                <input
                  type="text"
                  name="sisben"
                  placeholder="Ej: A1, B2"
                  value={formData.sisben}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Tipo de Discapacidad <span style={requiredStarStyle}>*</span>
                </label>
                <select
                  name="tipo_discapacidad"
                  required
                  value={formData.tipo_discapacidad}
                  onChange={handleChange}
                  style={getDynamicInputStyle(formData.tipo_discapacidad, true)}
                >
                  <option value="Ninguna">Ninguna</option>
                  <option value="Discapacidad física">
                    1. Discapacidad física
                  </option>
                  <option value="Discapacidad auditiva">
                    2. Discapacidad auditiva
                  </option>
                  <option value="Discapacidad visual">
                    3. Discapacidad visual
                  </option>
                  <option value="Sordoceguera">4. Sordoceguera</option>
                  <option value="Discapacidad intelectual">
                    5. Discapacidad intelectual
                  </option>
                  <option value="Discapacidad psicosocial">
                    6. Discapacidad psicosocial
                  </option>
                  <option value="Discapacidad múltiple">
                    7. Discapacidad múltiple
                  </option>
                </select>
              </div>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <h4 style={sectionHeaderStyle}>Historia Académica del Alumno</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Indique las instituciones educativas donde cursó los grados anteriores:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
              {(() => {
                const gradosAnteriores = obtenerGradosAnteriores(formData.grado);

                if (gradosAnteriores.length === 0) {
                  return (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        color: '#64748b',
                        fontSize: '13px',
                        fontStyle: 'italic',
                      }}
                    >
                      {formData.grado
                        ? `Para ${formData.grado} no se requiere registro de grados anteriores.`
                        : 'Por favor seleccione primero un grado en el Paso 1.'}
                    </div>
                  );
                }

                return gradosAnteriores.map((gradoNum) => (
                  <div
                    key={gradoNum}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#f8fafc',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        width: '75px',
                        color: '#16a34a',
                      }}
                    >
                      Grado {gradoNum} <span style={requiredStarStyle}>*</span>:
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Institución Educativa *"
                      value={
                        formData.historia_academica[`grado_${gradoNum}`] || ''
                      }
                      onChange={(e) =>
                        handleHistoriaChange(`grado_${gradoNum}`, e.target.value)
                      }
                      style={getDynamicInputStyle(
                        formData.historia_academica[`grado_${gradoNum}`],
                        true
                      )}
                    />
                  </div>
                ));
              })()}
            </div>

            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                background: '#EEFFE3',
                borderRadius: '8px',
                border: '1px solid #16a34a',
              }}
            >
              <label style={{ ...labelStyle, color: '#16a34a' }}>
                ¿Requiere Servicio de Ruta Escolar?
              </label>
              <select
                name="ruta_escolar"
                value={formData.ruta_escolar}
                onChange={handleChange}
                style={{ ...inputStyle, width: '200px', marginTop: '6px' }}
              >
                <option value="NO">NO</option>
                <option value="SI">SI</option>
              </select>
            </div>
          </div>
        )}

        {paso === 4 && (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h4 style={sectionHeaderStyle}>
              Información de Familiares y Acudiente
            </h4>

            {/* INFORMACIÓN DEL PADRE */}
            <div style={cardStyle}>
              <strong style={{ fontSize: '13px', color: '#334155' }}>
                INFORMACIÓN DEL PADRE
              </strong>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                <div className="md:col-span-2">
                  <label style={labelStyle}>Nombres y Apellidos</label>
                  <input
                    type="text"
                    name="padre_nombres"
                    placeholder="Nombres y Apellidos"
                    value={formData.padre_nombres}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tipo Doc.</label>
                  <select
                    name="padre_tipo_doc"
                    value={formData.padre_tipo_doc}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PPT">PPT</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>N° Documento</label>
                  <input
                    type="text"
                    name="padre_num_doc"
                    placeholder="N° Documento"
                    value={formData.padre_num_doc}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div>
                  <label style={labelStyle}>Celular</label>
                  <input
                    type="text"
                    name="padre_telefono"
                    placeholder="Celular"
                    value={formData.padre_telefono}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Dirección de Residencia</label>
                  <input
                    type="text"
                    name="padre_direccion"
                    placeholder="Dirección de Residencia"
                    value={formData.padre_direccion}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* INFORMACIÓN DE LA MADRE */}
            <div style={cardStyle}>
              <strong style={{ fontSize: '13px', color: '#334155' }}>
                INFORMACIÓN DE LA MADRE
              </strong>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                <div className="md:col-span-2">
                  <label style={labelStyle}>Nombres y Apellidos</label>
                  <input
                    type="text"
                    name="madre_nombres"
                    placeholder="Nombres y Apellidos"
                    value={formData.madre_nombres}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tipo Doc.</label>
                  <select
                    name="madre_tipo_doc"
                    value={formData.madre_tipo_doc}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PPT">PPT</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>N° Documento</label>
                  <input
                    type="text"
                    name="madre_num_doc"
                    placeholder="N° Documento"
                    value={formData.madre_num_doc}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div>
                  <label style={labelStyle}>Celular</label>
                  <input
                    type="text"
                    name="madre_telefono"
                    placeholder="Celular"
                    value={formData.madre_telefono}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Dirección de Residencia</label>
                  <input
                    type="text"
                    name="madre_direccion"
                    placeholder="Dirección de Residencia"
                    value={formData.madre_direccion}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* DATOS DEL ACUDIENTE */}
            <div
              style={{
                ...cardStyle,
                background: '#EEFFE3',
                border: '1px solid #16a34a',
              }}
            >
              <strong style={{ fontSize: '13px', color: '#16a34a' }}>
                DATOS DEL ACUDIENTE (AUTORIZACIÓN Y/O CUSTODIA){' '}
                <span style={requiredStarStyle}>*</span>
              </strong>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div>
                  <label style={labelStyle}>
                    Nombres y Apellidos <span style={requiredStarStyle}>*</span>
                  </label>
                  <input
                    type="text"
                    name="acudiente_nombres"
                    required
                    placeholder="Nombres y Apellidos Acudiente *"
                    value={formData.acudiente_nombres}
                    onChange={handleChange}
                    style={getDynamicInputStyle(
                      formData.acudiente_nombres,
                      true
                    )}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Parentesco <span style={requiredStarStyle}>*</span>
                  </label>
                  <input
                    type="text"
                    name="acudiente_parentesco"
                    required
                    placeholder="Parentesco (Ej: Madre, Tío) *"
                    value={formData.acudiente_parentesco}
                    onChange={handleChange}
                    style={getDynamicInputStyle(
                      formData.acudiente_parentesco,
                      true
                    )}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Tiene Custodia <span style={requiredStarStyle}>*</span>
                  </label>
                  <select
                    name="acudiente_custodia"
                    required
                    value={formData.acudiente_custodia}
                    onChange={handleChange}
                    style={getDynamicInputStyle(
                      formData.acudiente_custodia,
                      true
                    )}
                  >
                    <option value="SI">SI</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                <div>
                  <label style={labelStyle}>
                    Tipo Doc. <span style={requiredStarStyle}>*</span>
                  </label>
                  <select
                    name="acudiente_tipo_doc"
                    required
                    value={formData.acudiente_tipo_doc}
                    onChange={handleChange}
                    style={getDynamicInputStyle(
                      formData.acudiente_tipo_doc,
                      true
                    )}
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PPT">PPT</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>
                    N° Documento <span style={requiredStarStyle}>*</span>
                  </label>
                  <input
                    type="text"
                    name="acudiente_num_doc"
                    required
                    placeholder="N° Documento *"
                    value={formData.acudiente_num_doc}
                    onChange={handleChange}
                    style={getDynamicInputStyle(
                      formData.acudiente_num_doc,
                      true
                    )}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Celular <span style={requiredStarStyle}>*</span>
                  </label>
                  <input
                    type="text"
                    name="acudiente_telefono"
                    required
                    placeholder="Celular *"
                    value={formData.acudiente_telefono}
                    onChange={handleChange}
                    style={getDynamicInputStyle(
                      formData.acudiente_telefono,
                      true
                    )}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Correo Electrónico <span style={requiredStarStyle}>*</span>
                  </label>
                  <input
                    type="email"
                    name="acudiente_correo"
                    required
                    placeholder="Correo Electrónico *"
                    value={formData.acudiente_correo}
                    onChange={handleChange}
                    style={getDynamicInputStyle(
                      formData.acudiente_correo,
                      true
                    )}
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={labelStyle}>
                  Dirección de Residencia Acudiente{' '}
                  <span style={requiredStarStyle}>*</span>
                </label>
                <input
                  type="text"
                  name="acudiente_direccion"
                  required
                  placeholder="Dirección de Residencia Acudiente *"
                  value={formData.acudiente_direccion}
                  onChange={handleChange}
                  style={getDynamicInputStyle(
                    formData.acudiente_direccion,
                    true
                  )}
                />
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {paso > 1 ? (
            <button
              type="button"
              onClick={() => handleCambioPestana(paso - 1)}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Anterior
            </button>
          ) : (
            <div />
          )}

          {paso < 4 ? (
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                borderRadius: '6px',
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Siguiente Paso
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGuardarFinal}
              disabled={cargando}
              style={{
                padding: '10px 24px',
                borderRadius: '6px',
                border: 'none',
                background: cargando ? '#94a3b8' : '#16a34a',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              {cargando ? 'Guardando...' : 'Finalizar y Guardar Matrícula'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ESTILOS DE TABLAS Y CELDAS PROPORCIONALES (TAMAÑO DE FUENTE GENERAL: 10PX)
const pdfTableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginBottom: '1px',
  fontSize: '10px',
  tableLayout: 'fixed' as const,
};
const bgHeaderStyle = {
  backgroundColor: '#38bdf8',
  color: '#000',
  fontWeight: 'bold' as const,
  textAlign: 'center' as const,
  padding: '1px 2px',
  fontSize: '10px',
};
const thSubHeaderStyle = {
  backgroundColor: '#f1f5f9',
  color: '#000',
  fontWeight: 'bold' as const,
  textAlign: 'center' as const,
  fontSize: '10px',
  padding: '1px 2px',
};
const tdSubLabelStyle = {
  border: '1px solid #000',
  padding: '1px 2px',
  fontWeight: 'bold' as const,
  backgroundColor: '#f8fafc',
  fontSize: '10px',
};
const tdValueStyle = {
  border: '1px solid #000',
  padding: '1px 2px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
  fontSize: '10px',
};

// Estilos de Tabla para el Panel de Administración
const thTableStyle = { padding: '10px', fontSize: '12px' };
const tdTableStyle = { padding: '10px', color: '#334155' };

// Estilos auxiliares
const requiredStarStyle = {
  color: '#ef4444',
  fontWeight: 'bold',
};
const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#475569',
  marginBottom: '3px',
};
const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  boxSizing: 'border-box' as const,
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.2s, background-color 0.2s',
  color: '#111827',
  backgroundColor: '#ffffff',
};
const sectionHeaderStyle = {
  color: '#16a34a',
  margin: '0 0 4px',
  fontSize: '16px',
};
const cardStyle = {
  background: '#f8fafc',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};