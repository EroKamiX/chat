const axios = require("axios");
const fs = require("fs");

let video = {};

let headers = {
  // Host: "http://keeng.vn",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42",
};
async function checkLink(url, timeout = 60000) {
  try {
    const CancelToken = axios.CancelToken;
    let source = CancelToken.source();
    setTimeout(() => {
      source.cancel();
    }, timeout);

    let response = await axios.get(url, {
      method: "GET",
      cancelToken: source.token,
      timeout: timeout,
      headers: headers,
    });
    // console.log(response.data);
    return response.status;
  } catch (error) {
    if (error.response) {
      return error.response.status;
    }
    // console.log(error);
  }
  return 0;
}

async function keeng_url(key, item) {
  let res = await checkLink(item.url + ".html");

  if (res == 200) {
      console.log(res + " PUSH " + item.url + ".html");
      video[key] = item;
      video[key].url = video[key].url + ".html"
    } else {
    console.log(res + " " + item.url);
  }
}

(async () => {
  try {
    let threads = 50;
    let tasks = [];
    let data = JSON.parse(fs.readFileSync("./keeng.json", "utf-8"));

    // let result = await axios.get(
    //   "http://keeng.vn/audio/Gat-Het-Nhung-Qua-Khu-Chu-Bin-16/B2707F3E",
    //   { headers: headers }
    // );
    // console.log(result);
    for (const key in data) {
      tasks.push(keeng_url(key, data[key]));
      if (tasks.length >= threads) {
        await Promise.all(tasks);
        tasks = [];
      }
      //   let res = await axios.get(data[key].url);
      //   let title = res.data.slice(
      //     res.data.search(`<title>`) + 7,
      //     res.data.search(`</title>`)
      //   );
      //   video.key = data[key];
      //   video.key.title = title;
    }
    await Promise.all(tasks);
    console.log(video);
    fs.writeFileSync("keeng.json", JSON.stringify(video, null, 4));
  } catch (error) {
    console.log(error);
  }
})();
