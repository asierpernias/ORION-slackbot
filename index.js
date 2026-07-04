require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

app.command("/orion-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

(async () => {
  await app.start();
  console.log("bot is running!");
})();

function ObtenerConstelacioneEnCenit(lat, lon, fecha = new Date()) {
  const gst = Astronomy.SiderealTime(fecha);
  let lst = gst + lon / 15;
  lst = ((lst % 24) + 24) % 24;

  const ra = lst;
  const dec = lat;
  
  return Astronomy.Constellation(ra, dec);
}

app.command("/orion-help", async ({command, ack, respond}) => {
  await ack();
  await respond({text: `Commands: \n· /orion-ping \n ·/orion-cielo {City}\n·/orion-cielo {Constelacion}`})
});

const axios = require("axios");

async function obtenerCoordenadas(ciudad) {
  const { data } = await axios.get(
    "https://nominatim.openstreetmap.org/search",
    {
      params: {
        q: ciudad,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "SlackSkyBot/1.0",
      },
    }
  );

  if (!data.length) {
    throw new Error("Ciudad no encontada");
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
  };
}
const Astronomy = require("astronomy-engine");

app.command("/orion-cielo", async ({command, ack, respond})  => {
  await ack();

  try {
    const ciudad = command.text.trim();

    if (!ciudad) {
      return respond("You may use a city after command")
    }
    const { lat, lon} = await obtenerCoordenadas(ciudad);

    const constelacion = await ObtenerConstelacioneEnCenit(lat, lon);

    await respond({
      text: `En el cenit de ${ciudad} ahora mismo esta la constelación *${constelacion.name} * (${constelacion.symbol})`,
    });
  } catch(err) {
    console.error(err);
    console.log(JSON.stringify(err.response?.data, null, 2));

    await respond({
      text: "No se pudo obtener la carta del cielo."
    });
  }
});

async function obtenerInfoConstell(nombre) {
  const {data} = await axios.get(
    `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nombre)}`,
    {
      headers:  {
        "User-Agent": "ORIONSlackBot/1.0 (asier.pernias@gmail.com)",
      },
    }
  );

  return {
    titulo: data.title,
    extracto: data.extract,
    url: data.content_urls?.desktop?.page,
  };
}

app.command("/orion-info", async ({command, ack, respond}) => {
  await ack();

  try {
    const constelacion = command.text.trim();

    if (!constelacion) {
      return respond("Debes escribir el nombre de una constelacion, ej: /orion-info Orion");
    }

    const info = await obtenerInfoConstell(constelacion);

    await respond({
      text: `🌠 *${info.titulo}* \n${info.extracto}\n${info.url ?? ""}`,
    });
  } catch (err) {
    console.error(err);

    await respond({
      text: `No encontre informacion sobre ${command.text}.`
    });
  }
});