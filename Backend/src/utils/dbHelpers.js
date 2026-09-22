/**
 * Compara los datos actuales de MySQL contra el req.body
 * y construye la cláusula UPDATE y los valores para auditoría.
 * 
 * @param {Object} currentData - Registro actual extraído de MySQL
 * @param {Object} newData - Datos recibidos en req.body
 * @param {Object} fieldMapping - Objeto de mapeo { campoReqBody: 'columna_mysql' }
 * @returns {Object} { setClause, values, changedFields, hasChanges }
 */
export const buildDynamicUpdate = (currentData, newData, fieldMapping) => {
  const assignments = [];
  const values = [];
  const changedFields = {};

  for (const [bodyKey, dbColumn] of Object.entries(fieldMapping)) {
    let newValue = newData[bodyKey];

    // 1. Ignorar si la propiedad no fue enviada en la petición
    if (newValue === undefined) continue;

    let currentValue = currentData[dbColumn];

    // 2. Normalización de nulos y vacíos
    const normNew = (newValue === null || newValue === '') ? '' : newValue;
    const normCurrent = (currentValue === null || currentValue === '') ? '' : currentValue;

    // 3. Comparación según el tipo de dato
    let isDifferent = false;

    if (typeof normNew === 'object' || typeof normCurrent === 'object') {
      // Manejo de Arrays u Objetos JSON
      isDifferent = JSON.stringify(normNew) !== JSON.stringify(normCurrent);
      if (isDifferent && typeof newValue === 'object') {
        newValue = JSON.stringify(newValue); // Convertir a string para MySQL si es JSON
      }
    } else {
      // Comparación normalizada de cadenas y números
      isDifferent = String(normNew).trim() !== String(normCurrent).trim();
    }

    // 4. Si realmente varió, agregamos al query y al reporte
    if (isDifferent) {
      assignments.push(`${dbColumn} = ?`);
      values.push(newValue);

      changedFields[dbColumn] = {
        anterior: currentValue,
        nuevo: newValue
      };
    }
  }

  return {
    setClause: assignments.join(', '),
    values,
    changedFields,
    hasChanges: assignments.length > 0
  };
};