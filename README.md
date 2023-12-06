# Movie Maker

An experimental wrapper around ffmpeg using Deno.

Here's an example:

```ts
import { Movie } from '../mod.ts'

const movie = new Movie({
  output: './example/output.mp4',
  width: 480,
  height: 480,
  fps: 25,
  useTrimFilter: true,
  open: true,
  pixelFormat: 'yuvj422p',
  print: Deno.args[0] === 'print'
})

const fontFile = './example/thomasreggi1.ttf'
const file = (o: string) => `./example/originals/${o}.AVI`

const alley = file('DSCN3700')
const crab = file('DSCN3702')
const elevator = file('DSCN3701')
const steps = file('DSCN3696')
const hyrdant = file('DSCN3693')
const coffee = file('DSCN3689')
const lambo = file('DSCN3694')
const boot = file('DSCN3693')

movie.addFrame({ duration: 1 })
movie.addFile({ fileName: alley, ss: '00:00:04', t: '00:00:04', volume: 3 })
movie.addFile({ fileName: elevator, ss: '00:00:15', to: '00:00:17', volume: 4 }) // 6

const crabAudio = movie.addFile({ fileName: alley, ss: '00:00:04', to: '00:00:07', volume: 3, audioOnly: true })
movie.addFile({ fileName: crab, ss: '00:00:06', to: '00:00:09', saturation: 4, brightness: 0.1, audioIndex: crabAudio  })
movie.addFile({ fileName: elevator, ss: '00:00:18', to: '00:00:20', volume: 5 }) // 5
movie.addFile({ fileName: hyrdant, ss: '00:00:17', to: '00:00:20' })
movie.addFile({ fileName: elevator, ss: '00:00:21', to: '00:00:23', volume: 6 }) // 4

const lambaudio = movie.addFile({ fileName: alley, ss: '00:00:04', to: '00:00:07', volume: 3, audioOnly: true })
movie.addFile({ fileName: lambo, ss: '00:00:01', t: '00:00:03', saturation: 4, brightness: 0.1, audioIndex: lambaudio })

movie.addFile({ fileName: elevator, ss: '00:00:22', to: '00:00:24', volume: 7 }) // 3
movie.addFile({ fileName: boot, ss: '00:00:30', to: '00:00:35', volume: 3, reverse: true })
movie.addFile({ fileName: elevator, ss: '00:00:25', to: '00:00:27', volume: 8 }) // 2
movie.addFile({ fileName: steps, t: '00:00:02', volume: 0.3 })
movie.addFrame({ duration: .5 })
movie.addFile({ fileName: coffee, na: true, ss: '00:00:22', t: '00:00:05' })
movie.addFile({ fileName: elevator, ss: '00:00:29', t: '00:00:02', volume: 0.5}) // 1

const title = { fontSize: 60, fontFile, text: '6 floors', fontColor: 'white', center: true }
const name = { fontSize: 60, fontFile, text: 'thomas reggi', fontColor: 'white', center: true }
const date = { fontSize: 60, fontFile, text: 'dec 6 2023', fontColor: 'white', center: true }
movie.addFile({ fileName: elevator, ss: '00:00:31', volume: 0.5, draw: title })
movie.addFrame({ duration: 2, draw: title})
movie.addFrame({ duration: 5, draw: name})
movie.addFrame({ duration: 5, draw: date})

await movie.execute()
```