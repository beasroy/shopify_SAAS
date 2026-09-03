import express from "express";
import { 
  getBrandCreativesBatch, 
  clearCreativesCache,
  createCreativeGroup,
  getCreativeGroups,
  updateCreativeGroup,
  deleteCreativeGroup
} from "../controller/creative.js";
import { verifyAuth } from "../middleware/verifyAuth.js";

const router = express.Router();

router.post('/meta-creative/:brandId', verifyAuth, getBrandCreativesBatch);
router.delete('/meta-creative-cache/:brandId?', verifyAuth, clearCreativesCache);

// Creative Group Routes
router.post('/groups/:brandId', verifyAuth, createCreativeGroup);
router.get('/groups/:brandId', verifyAuth, getCreativeGroups);
router.patch('/groups/:brandId/:groupId', verifyAuth, updateCreativeGroup);
router.delete('/groups/:brandId/:groupId', verifyAuth, deleteCreativeGroup);

export default router;