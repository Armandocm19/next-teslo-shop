import { getSession } from 'next-auth/react';
import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../database';
import { IPaypal } from '../../../interfaces';
import { Order } from '../../../models';

type Data = {
    message: string
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {

    switch( req.method ) {
        case 'POST':
            return payOrder(req, res);

            default:
                res.status(400).json({ message: 'Bad request' })
    }

    
}

const getPaypalBearerToken = async ():Promise<string|null> => {

    const PAYPAL_CLIENT = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;

    const base64Token = Buffer.from(`${ PAYPAL_CLIENT }:${ PAYPAL_SECRET }`, 'utf-8').toString('base64');

    const body = new URLSearchParams('grant_type=client_credentials'); //generamos el urlencoded como string en base 64

    try {
        
        const { data } = await axios.post( process.env.PAYPAL_OAUTH_URL || '', body, {
           headers: {
            'Authorization': `Basic ${base64Token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
           }
        } );

        return data.access_token;

    } catch (error) {
        if( axios.isAxiosError(error) ){
            console.log(error.response?.data)
        } else {
            console.log(error)
        }

        return null;
    }

}

const payOrder = async(req: NextApiRequest, res: NextApiResponse<Data>) => {

    
    const session: any = await getSession({ req });

    if( !session ) {
        return {
            redirect: {
                destination: `/auth/login?p=/orders/${ req.body.orderId }`,
                permanent: false,
        }
        }
    }

    const paypalBearerToken = await getPaypalBearerToken(); //Obtenemos el token de validacion

    if( !paypalBearerToken ) {
        res.status(400).json({ message: 'No se pudo confirmar el token de paypal' });
    }

    const { transactionId = '', orderId= '' } = req.body;

    const { data } = await axios.get<IPaypal.PaypalOrderStatusResponse>(`${process.env.PAYPAL_ORDERS_URL}/${transactionId}`, { //Hacemos la peticion a paypal para saber si el orderId está pagado
        headers: {
            'Authorization': `Bearer ${ paypalBearerToken }`
        }
    });

    if( data.status !== 'COMPLETED' ) {
        return res.status(401).json({ message: 'Orden no reconocida' });
    }

    await db.connect();
    const dbOrder = await Order.findById( orderId );

    if( !dbOrder ){
        db.disconnect();
        return res.status(400).json({ message: 'Orden no existe en nuestra base de datos' });
    }

    if ( dbOrder.total !== Number(data.purchase_units[0].amount.value) ) { //Verifico que el total de la orden coincida con el de la orden almacenada en la base de datos
        await db.disconnect();
        return res.status(400).json({ message: 'Los montos de Paypal y nuestra orden no son iguales' });
    }

    dbOrder.transactionId = transactionId;
    dbOrder.isPaid = true;
    await dbOrder.save();

    await db.disconnect();


    res.status(200).json({ message: 'Orden pagada' });
}
