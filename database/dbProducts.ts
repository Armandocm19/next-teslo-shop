import { useProducts } from "../hooks";
import { IProduct } from "../interfaces";
import { Product } from "../models"
import { db } from "./"


export const getProductBySlug = async( slug: string ): Promise<IProduct | null> => {

    await db.connect()

    const product = await Product.findOne({slug}).lean();

    if ( !product ) {
        //await db.disconnect();
        return null;
    }
    
    product.images = product.images.map ( image => {
        return image.includes('http') ? image : `${ process.env.HOST_NAME }products/${ image }`
    } ); 
    
    await db.disconnect()

    return JSON.parse( JSON.stringify( product ) );

}

interface ProductSlug {
    slug: string
}

export const getAllProductsSlugs = async(): Promise<ProductSlug[]> => {

    await db.connect()
    const slugs = await Product.find().select('slug -_id').lean()
    await db.disconnect()

    return slugs;
}

export const getProductByTerm = async ( term: string ): Promise<IProduct[]> => {

    term = term.toString().toLowerCase()

    await db.connect();

    const products = await Product.find({
        $text: { $search: term }
    })
    .select('title images price inStock slug -_id')
    .lean();

    await db.disconnect();

    const updatedProducts = products.map ( product => {
        product.images = product.images.map ( image => {
            return image.includes('http') ? image : `${ process.env.HOST_NAME }products/${ image }`
        }); 

        return product;
    });

    return updatedProducts;

}

export const getAllProducts = async(): Promise<IProduct[]> => {

    await db.connect();
    const allProducts = await Product.find().lean();
    await db.disconnect();

    const updatedAllProducts = allProducts.map ( product => {
        product.images = product.images.map ( image => {
            return image.includes('http') ? image : `${ process.env.HOST_NAME }products/${ image }`
        }); 

        return product;
    });

    return JSON.parse( JSON.stringify( updatedAllProducts ) );

}