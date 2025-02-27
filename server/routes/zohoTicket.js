import express from 'express';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { getAllDepartments , getAllAgents, createDepartments, ListOfAgentsindepartments, createTicket, deleteDepartment} from '../controller/zohoTicket.js';


const router = express.Router();
router.get('/departments', verifyAuth, getAllDepartments)
router.get('/agents', verifyAuth, getAllAgents)
router.post('/create-departments', verifyAuth, createDepartments)
router.get('/agentIndepartment/:departmentId',verifyAuth,ListOfAgentsindepartments)
router.post('/create-ticket', verifyAuth, createTicket)
router.delete('/delete-departments',verifyAuth,deleteDepartment)
export default router;