import { Router } from "express";
import { CustomerRepository } from "./customer.repository";
import { CustomerService } from "./customer.service";
import { CustomerController } from "./customer.controller";
import { authenticateUserOrApiKey, resolveProjectContext } from "../../middleware/auth";

const router = Router();

const repository = new CustomerRepository();
const service = new CustomerService(repository);
const controller = new CustomerController(service);

// Apply dual auth and project context resolution
router.use(authenticateUserOrApiKey, resolveProjectContext);

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);

export default router;
