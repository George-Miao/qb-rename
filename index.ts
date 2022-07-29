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

const qb = new QBittorrent(process.env.QB_URL ?? 'http://localhost:8080/')
const api = new Api(qb)

const rename = async (t: RawTorrent) => {
  const { infohash_v1: hash, content_path, save_path } = t
  const oldPath = path.parse(content_path).base
  const files = await api.getTorrentFiles(hash)

  // check rules one by one, this cannot be parallelized
  for (let file of files) {
    for (let rule of episode_rules) {
      const matchObj = file.name.match(rule)
      if (!matchObj) continue

      const oldName = file.name
      const newName = `${matchObj[1].trim()} E${matchObj[2].trim()} ${matchObj[3].trim()}`

      console.log(`${oldName} -> ${newName}`)

      await api.renameTorrentFile(
        hash,
        oldName,
        newName
      )
      await checkSpace(hash, oldName)

      break
    }
  }
  await checkSpace(hash, oldPath)
}

const checkSpace = async (hash: string, oldName: string) => {
  const newName = oldName.replace(/\s{2,}/, ' ')
  if (newName !== oldName) {
    console.log(`${oldName} -> ${newName}`)
    await api.renameTorrentFile(hash, oldName, newName)
  }
}

const main = async () => {
  const [username, password] = [
    process.env.QB_USERNAME,
    process.env.QB_PASSWORD
  ]
  if (!username || !password) {
    console.error('QB_USERNAME and QB_PASSWORD must be set')
    process.exit(1)
  }
  await qb.login(username, password)

  const res = await api.getTorrents()

  await Promise.all(
    res.map(async t => {
      if (t.state === 'missingFiles') return
      // console.log(t)
      await rename(t)
    })
  )
}

main()
