import { Controller, Get, Redirect } from "@nestjs/common";

@Controller("/")
export class HomeController {
  @Get()
  @Redirect("/studio/", 302)
  getHome(): void {}
}
