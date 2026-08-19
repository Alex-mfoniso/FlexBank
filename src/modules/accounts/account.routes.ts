import { Router } from "express";
import { AccountRepository } from "./account.repository";
import { CustomerRepository } from "../customers/customer.repository";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { authenticateUserOrApiKey, resolveProjectContext } from "../../middleware/auth";

const router = Router();

const accountRepo = new AccountRepository();
const customerRepo = new CustomerRepository();
const service = new AccountService(accountRepo, customerRepo);
const controller = new AccountController(service);

// Apply dual auth and project context resolution
router.use(authenticateUserOrApiKey, resolveProjectContext);

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);

export default router;
