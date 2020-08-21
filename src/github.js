/**
 * @license Ticket Tagger automatically predicts and labels issue types.
 * Copyright (C) 2018,2019,2020  Rafael Kallis
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>. 
 *
 * @file github.js
 * @author Rafael Kallis <rk@rafaelkallis.com>
 */

"use strict";

const { App } = require("@octokit/app");
const request = require("superagent");

class Github {
  constructor({ appId, privateKey }) {
    this.app = new App({ id: appId, privateKey });
  }

  async installation({ installationId }) {
    /* app access token */
    const appAccessToken = this.app.getSignedJsonWebToken();

    /* installation access token */
    const response = await request
      .post(`https://api.github.com/app/installations/${installationId}/access_tokens`)
      .set("Authorization", `Bearer ${appAccessToken}`)
      .set("User-Agent", "Ticket-Tagger")
      .set("Accept", "application/vnd.github.machine-man-preview+json");
    const { token: accessToken } = response.body;

    return new Installation({ accessToken })
  }
}
exports.Github = Github;

class Installation {
  constructor({ accessToken }) {
    this.accessToken = accessToken;
  }

  async setIssueLabels({ labels, issueUrl }) {
    await request
      .patch(issueUrl)
      .set("Authorization", `token ${this.accessToken}`)
      .set("User-Agent", "Ticket-Tagger")
      .send({ labels });
  }
}