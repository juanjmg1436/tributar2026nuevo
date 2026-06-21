export interface ExamQuestion {
  id: number
  question: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
  explanation: string
  category: 'conceptos' | 'obligaciones' | 'comprobantes' | 'plazos' | 'calculo'
}

export interface ExamDef {
  regime: 'MONOTRIBUTO' | 'REGIMEN_GENERAL'
  title: string
  subtitle: string
  xpReward: number
  passingScore: number  // porcentaje mínimo para aprobar
  durationSeconds: number
  questions: ExamQuestion[]
}

// ═══════════════════════════════════════════════════════════════
// EXAMEN — RUTA DEL MONOTRIBUTISTA
// ═══════════════════════════════════════════════════════════════
export const EXAMEN_MONOTRIBUTO: ExamDef = {
  regime: 'MONOTRIBUTO',
  title: 'Examen Final: Monotributista',
  subtitle: '10 preguntas sobre el régimen simplificado unificado',
  xpReward: 500,
  passingScore: 70,
  durationSeconds: 15 * 60, // 15 minutos
  questions: [
    {
      id: 1,
      question: '¿Qué tipo de comprobante emite exclusivamente un Monotributista a sus clientes?',
      options: ['Factura A', 'Factura B', 'Factura C', 'Nota de débito'],
      correctIndex: 2,
      explanation: 'El Monotributista siempre emite Factura C, ya sea a consumidores finales u otros contribuyentes. No discrimina IVA porque éste ya está incluido en la cuota mensual.',
      category: 'comprobantes',
    },
    {
      id: 2,
      question: '¿Qué componentes integran la cuota mensual del Monotributo?',
      options: [
        'Solo el impuesto unificado (IVA + Ganancias)',
        'Impuesto unificado + aportes al SIPA + obra social',
        'IVA mensual + anticipo de Ganancias',
        'Aportes previsionales + impuesto provincial',
      ],
      correctIndex: 1,
      explanation: 'La cuota integrada del Monotributo tiene tres componentes: el impuesto unificado (que reemplaza IVA y Ganancias), los aportes al SIPA (jubilación) y el aporte a la obra social.',
      category: 'conceptos',
    },
    {
      id: 3,
      question: '¿En qué meses del año el Monotributista debe recategorizarse?',
      options: ['Enero y junio', 'Enero y julio', 'Marzo y septiembre', 'Solo en diciembre'],
      correctIndex: 1,
      explanation: 'La recategorización semestral se realiza en enero y julio de cada año. El contribuyente debe comparar sus ingresos reales de los últimos 12 meses con los topes de cada categoría.',
      category: 'plazos',
    },
    {
      id: 4,
      question: '¿Qué sucede cuando un Monotributista supera los ingresos máximos de la Categoría K?',
      options: [
        'Paga una multa y sigue en Monotributo',
        'Pasa automáticamente a la categoría siguiente',
        'Queda excluido del Monotributo y debe inscribirse en Régimen General',
        'Puede solicitar una prórroga de 6 meses',
      ],
      correctIndex: 2,
      explanation: 'La Categoría K es el techo del Monotributo. Quien supere sus ingresos queda excluido de pleno derecho y debe inscribirse como Responsable Inscripto (IVA + Ganancias) desde el mes siguiente al de la exclusión.',
      category: 'obligaciones',
    },
    {
      id: 5,
      question: '¿El Monotributista debe presentar DDJJ de IVA mensualmente ante AFIP/ARCA?',
      options: [
        'Sí, igual que un Responsable Inscripto',
        'No, el IVA está incluido en la cuota mensual unificada',
        'Solo si sus ventas superan cierto umbral mensual',
        'Sí, pero con una alícuota reducida del 10,5%',
      ],
      correctIndex: 1,
      explanation: 'El Monotributo es un régimen simplificado que reemplaza al IVA y a Ganancias con una cuota fija. Por eso, el Monotributista NO presenta DDJJ de IVA ni de Ganancias.',
      category: 'obligaciones',
    },
    {
      id: 6,
      question: '¿Qué parámetros determinan la categoría de un Monotributista?',
      options: [
        'Solo los ingresos brutos anuales',
        'Ingresos brutos + número de empleados',
        'Ingresos brutos + superficie afectada + energía eléctrica + alquileres devengados',
        'Solo la actividad económica declarada',
      ],
      correctIndex: 2,
      explanation: 'La categoría se determina por el parámetro más gravoso entre: ingresos brutos anuales, superficie del local afectado, energía eléctrica consumida y alquileres devengados. Para servicios, no aplican los últimos dos.',
      category: 'calculo',
    },
    {
      id: 7,
      question: '¿Qué es el Domicilio Fiscal Electrónico (DIFE) y por qué es obligatorio?',
      options: [
        'Es la dirección donde el contribuyente desarrolla su actividad',
        'Es el buzón electrónico oficial de AFIP/ARCA para notificaciones legales, obligatorio desde 2019',
        'Es el correo electrónico del contador habilitado',
        'Es una billetera virtual para pagar impuestos',
      ],
      correctIndex: 1,
      explanation: 'El DIFE es el domicilio electrónico constituido ante AFIP/ARCA. Las notificaciones enviadas allí tienen plena validez legal (equivalen a una carta documento). Es obligatorio para todos los contribuyentes.',
      category: 'conceptos',
    },
    {
      id: 8,
      question: '¿Para qué sirve habilitar un Punto de Venta (POS) ante AFIP/ARCA?',
      options: [
        'Para aceptar pagos con tarjeta de crédito o débito',
        'Para identificar el local comercial en el padrón de contribuyentes',
        'Para emitir comprobantes electrónicos autorizados (CAE o CAEA)',
        'Para acceder al plan de facilidades de pago',
      ],
      correctIndex: 2,
      explanation: 'El POS es el número que identifica cada punto de emisión de comprobantes. Para emitir facturas electrónicas, el contribuyente necesita tener al menos un POS habilitado, que otorga un CAE a cada comprobante emitido.',
      category: 'comprobantes',
    },
    {
      id: 9,
      question: '¿Cuándo debe adherirse al Monotributo alguien que inicia actividades?',
      options: [
        'Dentro de los 30 días hábiles de iniciar actividades',
        'Antes de emitir el primer comprobante o factura',
        'Al cierre del primer mes calendario',
        'En la primera recategorización de enero o julio',
      ],
      correctIndex: 1,
      explanation: 'Un contribuyente que inicia actividades debe adherirse al Monotributo ANTES de emitir su primer comprobante. No puede facturar sin haber adherido previamente al régimen.',
      category: 'plazos',
    },
    {
      id: 10,
      question: '¿Un Monotributista puede deducir gastos de su actividad en el impuesto a las Ganancias?',
      options: [
        'Sí, puede deducir todos los gastos de la actividad',
        'No, porque el Monotributo reemplaza a Ganancias con una cuota fija',
        'Solo puede deducir gastos de movilidad y papelería',
        'Sí, pero solo hasta el 30% de los ingresos brutos',
      ],
      correctIndex: 1,
      explanation: 'El Monotributo es un régimen sustitutivo de Ganancias. El Monotributista paga la cuota fija en lugar de calcular Ganancias, por lo que NO hace deducciones ni presenta DDJJ de Ganancias.',
      category: 'conceptos',
    },
  ],
}

// ═══════════════════════════════════════════════════════════════
// EXAMEN — RUTA DEL RÉGIMEN GENERAL
// ═══════════════════════════════════════════════════════════════
export const EXAMEN_REGIMEN_GENERAL: ExamDef = {
  regime: 'REGIMEN_GENERAL',
  title: 'Examen Final: Régimen General',
  subtitle: '10 preguntas sobre IVA, Ganancias y obligaciones como RI',
  xpReward: 500,
  passingScore: 70,
  durationSeconds: 15 * 60,
  questions: [
    {
      id: 1,
      question: '¿Qué factura emite un Responsable Inscripto (RI) cuando vende a OTRO RI?',
      options: ['Factura B', 'Factura C', 'Factura A', 'Factura M'],
      correctIndex: 2,
      explanation: 'La Factura A se emite entre RI. Discrimina el IVA (lo muestra separado del precio neto). El comprador RI puede tomar ese IVA como crédito fiscal.',
      category: 'comprobantes',
    },
    {
      id: 2,
      question: '¿Con qué periodicidad debe presentarse la DDJJ de IVA (F.2002)?',
      options: ['Anual, en marzo', 'Mensual, al mes siguiente del período', 'Trimestral', 'Semestral'],
      correctIndex: 1,
      explanation: 'La DDJJ de IVA es mensual. Se presenta durante el mes siguiente al período declarado, según el vencimiento que corresponda al CUIT del contribuyente (últimos dígitos del CUIT determinan la fecha).',
      category: 'plazos',
    },
    {
      id: 3,
      question: '¿Cómo se calcula el IVA a ingresar en cada período?',
      options: [
        'Crédito fiscal − Débito fiscal',
        'Débito fiscal − Crédito fiscal',
        '(Ventas + Compras) × 21%',
        'Ventas netas × 21%',
      ],
      correctIndex: 1,
      explanation: 'IVA a ingresar = Débito fiscal (IVA de ventas) − Crédito fiscal (IVA de compras). Si el resultado es negativo, queda un saldo técnico a favor del contribuyente para períodos futuros.',
      category: 'calculo',
    },
    {
      id: 4,
      question: '¿Qué es el "crédito fiscal" en el contexto del IVA?',
      options: [
        'El IVA que el contribuyente cobra a sus clientes en las ventas',
        'El IVA que el contribuyente paga en sus compras e inversiones',
        'Un beneficio fiscal por exportaciones',
        'El saldo a favor acumulado de períodos anteriores',
      ],
      correctIndex: 1,
      explanation: 'El crédito fiscal es el IVA pagado en las compras, gastos e inversiones vinculados a la actividad gravada. Este monto "descuenta" del IVA cobrado en las ventas (débito fiscal).',
      category: 'conceptos',
    },
    {
      id: 5,
      question: '¿Qué es un Volante Electrónico de Pago (VEP)?',
      options: [
        'Una factura electrónica emitida al Estado',
        'Un comprobante de transferencia bancaria',
        'Un instrumento de pago generado por el sistema de AFIP/ARCA para pagar impuestos',
        'Una nota de crédito enviada a AFIP',
      ],
      correctIndex: 2,
      explanation: 'El VEP es el instrumento oficial para pagar impuestos nacionales (IVA, Ganancias, etc.) a través de homebanking o banco. El contribuyente genera el VEP en AFIP/ARCA y lo paga con el código que genera el sistema.',
      category: 'conceptos',
    },
    {
      id: 6,
      question: '¿Cuál es la alícuota general del IVA vigente en Argentina?',
      options: ['10,5%', '27%', '21%', '15%'],
      correctIndex: 2,
      explanation: 'La alícuota general del IVA es del 21%. Existen alícuotas reducidas (10,5%) para bienes de la canasta básica, medicamentos y construcción, y alícuota diferencial (27%) para servicios de telecomunicaciones y gas/electricidad.',
      category: 'calculo',
    },
    {
      id: 7,
      question: '¿Para qué sirve el formulario F.713?',
      options: [
        'Para la DDJJ mensual de IVA',
        'Para declarar las cargas sociales (F.931)',
        'Para la DDJJ anual del impuesto a las Ganancias de personas jurídicas',
        'Para registrar el alta de un empleado',
      ],
      correctIndex: 2,
      explanation: 'El F.713 es el formulario para la declaración jurada anual del impuesto a las Ganancias de sociedades y empresas (personas jurídicas). Se presenta en los meses posteriores al cierre del ejercicio económico.',
      category: 'obligaciones',
    },
    {
      id: 8,
      question: '¿Qué son los "anticipos" en el impuesto a las Ganancias?',
      options: [
        'Pagos a cuenta del impuesto del período siguiente, calculados sobre la declaración del año anterior',
        'Deducciones especiales por gastos del período',
        'Multas por presentación tardía de la declaración anual',
        'Créditos fiscales por inversiones en bienes de capital',
      ],
      correctIndex: 0,
      explanation: 'Los anticipos son pagos a cuenta del impuesto de Ganancias del próximo período fiscal. Se calculan como un porcentaje del impuesto determinado del año anterior. Generalmente son 10 cuotas mensuales que vencen desde junio a marzo.',
      category: 'obligaciones',
    },
    {
      id: 9,
      question: '¿Qué información se declara en el F.931?',
      options: [
        'Las ventas y compras mensuales del contribuyente',
        'Los aportes y contribuciones de la seguridad social sobre los sueldos del período',
        'Las ganancias netas del ejercicio fiscal',
        'El detalle de facturas emitidas y recibidas',
      ],
      correctIndex: 1,
      explanation: 'El F.931 (Sistema Integrado Previsional Argentino – SIPA) es la DDJJ mensual de cargas sociales. Informa los sueldos brutos de los empleados y los correspondientes aportes y contribuciones al sistema de seguridad social.',
      category: 'obligaciones',
    },
    {
      id: 10,
      question: '¿Cuál es la diferencia principal entre Factura A y Factura B?',
      options: [
        'La Factura A se emite a consumidores finales; la B a otros RI',
        'La Factura A discrimina el IVA (para RI); la B no discrimina (para consumidores finales)',
        'La Factura B tiene una alícuota de IVA mayor que la A',
        'No hay diferencia, son intercambiables',
      ],
      correctIndex: 1,
      explanation: 'Factura A: para ventas a RI, discrimina el IVA en el comprobante. El comprador puede usar ese IVA como crédito fiscal. Factura B: para ventas a consumidores finales, exentos o no responsables; el IVA está incluido en el precio total.',
      category: 'comprobantes',
    },
  ],
}

export const EXAMENES: Record<string, ExamDef> = {
  MONOTRIBUTO: EXAMEN_MONOTRIBUTO,
  REGIMEN_GENERAL: EXAMEN_REGIMEN_GENERAL,
}

export function getExamenByRegimen(regimen: string): ExamDef | null {
  return EXAMENES[regimen.toUpperCase()] ?? null
}

export const EXAM_STORAGE_KEY = (userId: string, regime: string) =>
  `tributar_exam_${userId}_${regime}`

export interface ExamResult {
  userId: string
  regime: string
  score: number          // 0-100 porcentaje
  correctCount: number
  totalQuestions: number
  passed: boolean
  answers: number[]      // índice seleccionado por pregunta
  completedAt: string    // ISO date
  xpAwarded: number
}
