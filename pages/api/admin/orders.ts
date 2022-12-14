import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../database';
import { IOrder } from '../../../interfaces';
import { Order } from '../../../models';

type Data = 
| { message: string }
| IOrder[]

export default function (req: NextApiRequest, res: NextApiResponse<Data>) {
    
    switch( req.method ) {
        case 'GET':
            return getOrders(req, res);

        default:
            return res.status(400).json({ message: 'Bad request' });
    }

}

const getOrders = async(req: NextApiRequest, res: NextApiResponse<Data>) => {
   
    await db.connect();
    const orders = await Order.find()
        .sort({ createdAt: 'desc' })
        .populate('user', 'name email') //indicamos la referencia de usuarios y el esquema de usuarios, para que me traiga unicamente el 'name email'
        .lean();

    if( !orders ){
        await db.disconnect();
        return null;
    }

    await db.disconnect();

    return res.status(200).json( orders );

}
