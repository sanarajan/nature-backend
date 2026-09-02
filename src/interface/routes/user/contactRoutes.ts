import express from 'express';
import { container } from 'tsyringe';
import { ContactController } from '../../controllers/user/ContactController';

const router = express.Router();
const contactController = container.resolve(ContactController);

router.post('/submit', contactController.submitForm);

export default router;
