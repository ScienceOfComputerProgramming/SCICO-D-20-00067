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
 * @file app integration test
 * @author Rafael Kallis <rk@rafaelkallis.com>
 */

"use strict";

jest.setTimeout(5 * 60 * 1000);

const nock = require("nock");
const request = require("supertest");
const App = require("./app");
const github = require("./github");
const config = require("./config");

describe("app integration test", () => {
  let app;
  let signatureSha1;
  let signatureSha256;
  let getAccessTokenScope;
  let setLabelsScope;

  beforeEach(async () => {
    app = await App();

    getAccessTokenScope = nock(`https://api.github.com`)
      .post(`/app/installations/${payload.installation.id}/access_tokens`)
      .matchHeader(
        "Authorization",
        /^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+$/
      )
      .matchHeader("User-Agent", "Ticket-Tagger")
      .matchHeader("Content-Type", "application/json")
      .matchHeader("Accept", "application/vnd.github.v3+json")
      .delay(500)
      .reply(200, { token: "installation-access-token" });

    setLabelsScope = nock(`https://api.github.com`)
      .matchHeader("Authorization", "token installation-access-token")
      .matchHeader("User-Agent", "Ticket-Tagger")
      .matchHeader("Content-Type", "application/json")
      .matchHeader("Accept", "application/vnd.github.v3+json")
      .put("/repos/rafaelkallis/throwaway/issues/62/labels")
      .delay(500)
      .reply(200);

    signatureSha1 = github.sign({
      payload: JSON.stringify(payload),
      secret: config.GITHUB_SECRET,
      algorithm: "sha1",
    });

    signatureSha256 = github.sign({
      payload: JSON.stringify(payload),
      secret: config.GITHUB_SECRET,
      algorithm: "sha256",
    });
  });

  afterEach(async () => {
    nock.restore();
  });

  test("integration", async () => {
    const response = await request(app)
      .post("/webhook")
      .set("X-Github-Delivery", "123e4567-e89b-12d3-a456-426655440000")
      .set("X-Github-Event", "issues")
      .set("X-Hub-Signature", signatureSha1)
      .set("X-Hub-Signature-256", signatureSha256)
      .send(payload);

    expect(response.status).toBe(200);

    getAccessTokenScope.done();
    setLabelsScope.done();
  });

  test("reject invalid signature", async () => {
    const response = await request(app)
      .post("/webhook")
      .set("X-Github-Delivery", "123e4567-e89b-12d3-a456-426655440000")
      .set("X-Github-Event", "issues.opened")
      .set("X-Hub-Signature", "non-sense")
      .set("X-Hub-Signature-256", "non-sense")
      .send(payload);

    expect(response.status).toBe(400);
  });
});

const payload = {
  action: "opened",
  issue: {
    url: "https://api.github.com/repos/rafaelkallis/throwaway/issues/62",
    repository_url: "https://api.github.com/repos/rafaelkallis/throwaway",
    labels_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/issues/62/labels{/name}",
    comments_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/issues/62/comments",
    events_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/issues/62/events",
    html_url: "https://github.com/rafaelkallis/throwaway/issues/62",
    id: 388584221,
    node_id: "MDU6SXNzdWUzODg1ODQyMjE=",
    number: 62,
    title: "Trailer header field included with 304",
    user: {
      login: "rafaelkallis",
      id: 9661903,
      node_id: "MDQ6VXNlcjk2NjE5MDM=",
      avatar_url: "https://avatars2.githubusercontent.com/u/9661903?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/rafaelkallis",
      html_url: "https://github.com/rafaelkallis",
      followers_url: "https://api.github.com/users/rafaelkallis/followers",
      following_url:
        "https://api.github.com/users/rafaelkallis/following{/other_user}",
      gists_url: "https://api.github.com/users/rafaelkallis/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/rafaelkallis/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/rafaelkallis/subscriptions",
      organizations_url: "https://api.github.com/users/rafaelkallis/orgs",
      repos_url: "https://api.github.com/users/rafaelkallis/repos",
      events_url: "https://api.github.com/users/rafaelkallis/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/rafaelkallis/received_events",
      type: "User",
      site_admin: false,
    },
    labels: [],
    state: "open",
    locked: false,
    assignee: null,
    assignees: [],
    milestone: null,
    comments: 0,
    created_at: "2018-12-07T10:04:31Z",
    updated_at: "2018-12-07T10:04:31Z",
    closed_at: null,
    author_association: "OWNER",
    body:
      "Including the Trailer header field with responses that don't have Transfer-Encoding: chunked causes some (overly strict?) proxies to drop the response e.g. IBM Bluemix sends back a 502 instead of the response generated by Express.\r\n\r\nI think a possible solution here would be to remove the Trailer header field for 304, in addition to the fields currently removed. Here is where that code lives: https://github.com/strongloop/express/blob/f73ff9243006ea010fffdaa748f06df3a5b986e7/lib/response.js#L192",
  },
  repository: {
    id: 155344077,
    node_id: "MDEwOlJlcG9zaXRvcnkxNTUzNDQwNzc=",
    name: "throwaway",
    full_name: "rafaelkallis/throwaway",
    private: true,
    owner: {
      login: "rafaelkallis",
      id: 9661903,
      node_id: "MDQ6VXNlcjk2NjE5MDM=",
      avatar_url: "https://avatars2.githubusercontent.com/u/9661903?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/rafaelkallis",
      html_url: "https://github.com/rafaelkallis",
      followers_url: "https://api.github.com/users/rafaelkallis/followers",
      following_url:
        "https://api.github.com/users/rafaelkallis/following{/other_user}",
      gists_url: "https://api.github.com/users/rafaelkallis/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/rafaelkallis/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/rafaelkallis/subscriptions",
      organizations_url: "https://api.github.com/users/rafaelkallis/orgs",
      repos_url: "https://api.github.com/users/rafaelkallis/repos",
      events_url: "https://api.github.com/users/rafaelkallis/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/rafaelkallis/received_events",
      type: "User",
      site_admin: false,
    },
    html_url: "https://github.com/rafaelkallis/throwaway",
    description: null,
    fork: false,
    url: "https://api.github.com/repos/rafaelkallis/throwaway",
    forks_url: "https://api.github.com/repos/rafaelkallis/throwaway/forks",
    keys_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/keys{/key_id}",
    collaborators_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/collaborators{/collaborator}",
    teams_url: "https://api.github.com/repos/rafaelkallis/throwaway/teams",
    hooks_url: "https://api.github.com/repos/rafaelkallis/throwaway/hooks",
    issue_events_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/issues/events{/number}",
    events_url: "https://api.github.com/repos/rafaelkallis/throwaway/events",
    assignees_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/assignees{/user}",
    branches_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/branches{/branch}",
    tags_url: "https://api.github.com/repos/rafaelkallis/throwaway/tags",
    blobs_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/git/blobs{/sha}",
    git_tags_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/git/tags{/sha}",
    git_refs_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/git/refs{/sha}",
    trees_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/git/trees{/sha}",
    statuses_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/statuses/{sha}",
    languages_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/languages",
    stargazers_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/stargazers",
    contributors_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/contributors",
    subscribers_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/subscribers",
    subscription_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/subscription",
    commits_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/commits{/sha}",
    git_commits_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/git/commits{/sha}",
    comments_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/comments{/number}",
    issue_comment_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/issues/comments{/number}",
    contents_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/contents/{+path}",
    compare_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/compare/{base}...{head}",
    merges_url: "https://api.github.com/repos/rafaelkallis/throwaway/merges",
    archive_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/{archive_format}{/ref}",
    downloads_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/downloads",
    issues_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/issues{/number}",
    pulls_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/pulls{/number}",
    milestones_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/milestones{/number}",
    notifications_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/notifications{?since,all,participating}",
    labels_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/labels{/name}",
    releases_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/releases{/id}",
    deployments_url:
      "https://api.github.com/repos/rafaelkallis/throwaway/deployments",
    created_at: "2018-10-30T07:41:36Z",
    updated_at: "2018-10-30T07:41:36Z",
    pushed_at: "2018-10-30T07:41:37Z",
    git_url: "git://github.com/rafaelkallis/throwaway.git",
    ssh_url: "git@github.com:rafaelkallis/throwaway.git",
    clone_url: "https://github.com/rafaelkallis/throwaway.git",
    svn_url: "https://github.com/rafaelkallis/throwaway",
    homepage: null,
    size: 0,
    stargazers_count: 0,
    watchers_count: 0,
    language: null,
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: false,
    forks_count: 0,
    mirror_url: null,
    archived: false,
    open_issues_count: 13,
    license: null,
    forks: 0,
    open_issues: 13,
    watchers: 0,
    default_branch: "master",
  },
  sender: {
    login: "rafaelkallis",
    id: 9661903,
    node_id: "MDQ6VXNlcjk2NjE5MDM=",
    avatar_url: "https://avatars2.githubusercontent.com/u/9661903?v=4",
    gravatar_id: "",
    url: "https://api.github.com/users/rafaelkallis",
    html_url: "https://github.com/rafaelkallis",
    followers_url: "https://api.github.com/users/rafaelkallis/followers",
    following_url:
      "https://api.github.com/users/rafaelkallis/following{/other_user}",
    gists_url: "https://api.github.com/users/rafaelkallis/gists{/gist_id}",
    starred_url:
      "https://api.github.com/users/rafaelkallis/starred{/owner}{/repo}",
    subscriptions_url:
      "https://api.github.com/users/rafaelkallis/subscriptions",
    organizations_url: "https://api.github.com/users/rafaelkallis/orgs",
    repos_url: "https://api.github.com/users/rafaelkallis/repos",
    events_url: "https://api.github.com/users/rafaelkallis/events{/privacy}",
    received_events_url:
      "https://api.github.com/users/rafaelkallis/received_events",
    type: "User",
    site_admin: false,
  },
  installation: {
    id: 435111,
    node_id: "MDIzOkludGVncmF0aW9uSW5zdGFsbGF0aW9uNDM1MTEx",
  },
};
