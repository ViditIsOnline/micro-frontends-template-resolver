import express from "express";
import path from "path";
import fs from "fs";
import cheerio from "cheerio";

import fetch from "../utils/fetch";
import templateRegistry from "../templateRegistry";
import { createScriptTag, createStyleTag } from "../utils";

const MODULE_RESOLVER_ENDPOINT =
  process.env.MODULE_RESOLVER_ENDPOINT || "http://localhost:8001";

const pageRenderer = async (req, res, next) => {
  const pageName = req.path.split("/")[1];

  if (templateRegistry[pageName]) {
    const { modules } = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../moduleData/",
          `${templateRegistry[pageName]}.json`
        )
      )
    );

    const $ = cheerio.load(
      fs.readFileSync(path.resolve(__dirname, "../templates/", "index.html"))
    );

    const modulesPromiseList = [],
      root = $("#root");

    modules.forEach(element => {
      let { endPoint, moduleName } = element;
      modulesPromiseList.push(
        fetch(
          MODULE_RESOLVER_ENDPOINT + "/" + moduleName,
          {
            method: "POST",
            body: JSON.stringify({
              api: endPoint || ""
            }),
            headers: { "Content-Type": "application/json" }
          },
          content => {
            root.append($("<div>").html(content.html));
            content.css.forEach(function(link) {
              createStyleTag(link, $);
            });

            content.js.forEach(function(src) {
              createScriptTag(src, $);
            });
          }
        )
      );
    });

    await Promise.all(modulesPromiseList);

    res.send($.html());
  } else res.send("Unknown page.");
};

export default pageRenderer;
