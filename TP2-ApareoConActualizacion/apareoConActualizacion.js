const fs = require('fs')
const util = require('util')


/**
 * ordena (in place) una coleccion de datos segun las claves provistas.
 * @param {Object[]} coleccion el array que quiero ordenar
 * @param {string[]} claves las claves por las que quiero ordenar, por orden de importancia
 */
function ordenar(coleccion, claves) {
    coleccion.sort(function(a,b){
        let i = 0;
        let flag = true;
        let result = 0;
        while( flag && i < claves.length){
            if(a[claves[i]] < b[claves[i]]){
                flag = false;
                result = -1;
            }else{
                flag = false;
                result = 1;
            }
            i++;
        }
        return result;
    })
}

/**
 * recibe las rutas del archivo de deudas original, archivo de pagos, archivo de deudas con las actualizaciones, y archivo de log para registrar errores o advertencias.
 * @param {string} rutaDeudasOld 
 * @param {string} rutaPagos 
 * @param {string} rutaDeudasNew 
 * @param {string} rutaLog 
 */
function actualizarArchivosDeudas(rutaDeudasOld, rutaPagos, rutaDeudasNew, rutaLog) {
    const deudasString = fs.readFileSync( rutaDeudasOld, 'utf-8' );
    const deudasJson = JSON.parse( deudasString );
    ordenar( deudasJson, ['dni']);

    const pagosString = fs.readFileSync( rutaPagos, 'utf-8' );
    const pagosJson = JSON.parse( pagosString );
    ordenar( pagosJson, ['dni', 'fecha'] );
    console.log(pagosJson);

    const deudasActualizadas = actualizarDeudas(deudasJson, pagosJson, msg => {
        fs.appendFileSync(rutaLog, msg);
    })

    const newDeudas = JSON.stringify(deudasActualizadas, null, 4);
    fs.writeFileSync(rutaDeudasNew, newDeudas);
}

/**
 * @callback loggerCallback 
 * @param {string} error error message to display
 */

/**
 * realiza el apareo con actualizacion entre deudas y pagos, y loguea algunos eventos relevantes.
 * @param {Object[]} deudas las deudas originales
 * @param {Object[]} pagos los pagos a aplicar
 * @param {loggerCallback} logger funcion a la cual llamar en caso de necesitar loguear un evento
 * @returns {Object[]} las deudas actualizadas
 */
function actualizarDeudas(deudas, pagos, logger) {
	let deudasActualizadas = [];
    let i = 0;
    let j = 0;

    while( i < pagos.length || j < deudas.length ){
        if( i >= pagos.length ){
            deudasActualizadas.push(deudas[j]);
            j++
        }else if( j >= deudas.length ){ 
            logger(armarMsgPagoSinDeudaAsociada(pagos[i]));
            i++
        }else if( pagos[i].dni < deudas[j].dni ){
            logger(armarMsgPagoSinDeudaAsociada(pagos[j]));
            i++
        }else if( deudas[j].dni < pagos[i].dni ){
            if(deudas[j].debe < 0){
                logger(armarMsgPagoDeMas(deudas[i]));
            }else{
                deudasActualizadas.push(deudas[j]);
            }
            j++
        }else{
            if(pagos[i].apellido == deudas.apellido){
                deudas[j].debe -= pagos[i].pago;
            }else{
                logger(armarMsgPagoConDatosErroneos(deudas[j], pagos[i]));
            }
            j++
        }
    }
}

/**
 * arma un mensaje informando los detalles de un pago que no corresponde a ninguna deuda 
 * @param {Object} pago el pago sin deuda correspondiente
 * @returns {string} el mensaje a loguear
 */
function armarMsgPagoSinDeudaAsociada(pago) {
    const logMsg = `
el siguiente pago no corresponde a ninguna deuda:
${util.inspect(pago)}

=================================
`
    return logMsg
}

/**
 * arma un mensaje indicando el dni del sujeto que pagó de más, y cuanto dinero quedó a su favor
 * @param {Object} deuda la deuda con excedente de pago
 * @returns {string} el mensaje a logguear
 */
function armarMsgPagoDeMas(deuda) {
    const logMsg = `
dni: ${deuda.dni} posee $${Math.abs(deuda.debe)} a su favor

=================================
`
    return logMsg
}

/**
 * arma un mensaje mostrando la deuda, y el pago que no se pudo concretar, y notifica que el registro permanece sin cambios.
 * @param {Object} deuda 
 * @param {Object} pago
 * @returns {string} el mensaje a logguear
 */
function armarMsgPagoConDatosErroneos(deuda, pago) {
    const logMsg = `
error al querer actualizar esta deuda:
${util.inspect(deuda)}
con este pago:
${util.inspect(pago)}

se mantiene el registro original sin cambios

=================================
`
    return logMsg
}

module.exports = {
    actualizarArchivosDeudas
}
