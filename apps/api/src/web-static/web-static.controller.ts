import { Controller, Get, Header } from "@nestjs/common";
import { readWebStaticPage } from "./web-static-page.js";

@Controller()
export class WebStaticController {
  @Get(["studio", "studio/"])
  @Header("Content-Type", "text/html; charset=utf-8")
  getStudio(): Promise<string> {
    return readWebStaticPage("studio");
  }

  @Get(["play", "play/"])
  @Header("Content-Type", "text/html; charset=utf-8")
  getPlay(): Promise<string> {
    return readWebStaticPage("play");
  }

  @Get(["admin", "admin/"])
  @Header("Content-Type", "text/html; charset=utf-8")
  getAdmin(): Promise<string> {
    return readWebStaticPage("admin");
  }
}
