import path from 'path'

import { Api, QBittorrent, RawTorrent } from '@georgemiao/qbit.js'

const episode_rules = [
  /(.*)\[(\d{1,3}|\d{1,3}\.\d{1,2})(?:v\d{1,2})?(?:END)?\](.*)/,
  /(.*)\[E(\d{1,3}|\d{1,3}\.\d{1,2})(?:v\d{1,2})?(?:END)?\](.*)/,
  /(.*)\[第(\d*\.*\d*)话(?:END)?\](.*)/,
  /(.*)\[第(\d*\.*\d*)話(?:END)?\](.*)/,
  /(.*)第(\d*\.*\d*)话(?:END)?(.*)/,
  /(.*)第(\d*\.*\d*)話(?:END)?(.*)/,
  /(.*)- (\d{1,3}|\d{1,3}\.\d{1,2})(?:v\d{1,2})?(?:END)? (.*)/
]

const qb = new QBittorrent(process.env.QB_URL ?? "http://localhost:8080/")
const api = new Api(qb)

const rename = async (t: RawTorrent) => {
  const { infohash_v1: hash, content_path } = t
  const oldPath = path.parse(content_path).base

  for (let rule of episode_rules) {
    const matchObj = oldPath.match(rule)
    if (matchObj) {
      const newPath = `${matchObj[1].trim()} E${matchObj[2].trim()} ${matchObj[3].trim()}`
      console.log(content_path)
      console.log(`${oldPath} -> ${newPath}`)

      await api.renameTorrentFile(hash, oldPath, newPath)

      await general_check(hash, oldPath)
      return
    }
  }
  await general_check(hash, oldPath)
}

const general_check = async (hash: string, oldPath: string) => {
  const newPath = oldPath.split(' ').join(' ')
  if (newPath !== oldPath) {
    console.log(`${oldPath} -> ${newPath}`)
    await api.renameTorrentFile(hash, oldPath, newPath)
  }
}

const escapeName = (t: RawTorrent) => ({ ...t, name: t.name.replace('/', ' ') })

async function main() {
  const [username, password] = [process.env.QB_USERNAME, process.env.QB_PASSWORD]
  if (!username || !password) {
    console.error('QB_USERNAME and QB_PASSWORD must be set')
    process.exit(1)
  }
  await qb.login(username, password)

  const res = await api.getTorrents().then(x => x.map(escapeName))

  for (let t of res) {
    if (t.state === 'missingFiles') continue
    // console.log(t)
    await rename(t)
  }
}

main()
