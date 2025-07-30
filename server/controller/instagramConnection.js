import InstagramConnection from '../models/InstagramConnection';
import Brand from '../models/Brand';

export const getInstagramName = async (req, res) => {
    const { brandId } = req.body;
    const instagramConnection = await InstagramConnection.findOne({ brandId });
    res.json(instagramConnection);
};

export const createInstagramConnection = async (req, res) => {
    const { shopId, instagramUsername } = req.body;
    const brand = await Brand.findOne({ shopId });
    const brandId = brand._id;
    const instagramConnection = await InstagramConnection.create({ brandId, shopId, instagramUsername });
    res.json(instagramConnection);
};

