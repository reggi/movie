import $ from "https://deno.land/x/dax@0.35.0/mod.ts";

function convertTimeToSeconds(time: string | number): number {
  if (typeof time === 'number') return time
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function convertSecondsToTime(seconds: string | number): string {
  if (typeof seconds === 'string') return seconds
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map(val => val.toString().padStart(2, '0'))
    .join(':');
}

interface DrawTextOptions {
  fontSize: number;
  fontFile: string;
  text: string;
  fontColor: string;
  center: boolean;
}

function buildDrawTextString(options: DrawTextOptions): string {
  const drawTextParts = [
      `fontsize=${options.fontSize}`,
      `fontfile=${options.fontFile}`,
      `text='${options.text}'`,
      options.center ? "x=(w-text_w)/2" : "x=0",
      options.center ? "y=(h-text_h)/2" : "y=0",
      `fontcolor=${options.fontColor}`
  ];

  return `drawtext=${drawTextParts.join(':')}`;
}

function trim(options: { ss?: string | number | undefined, to?: string | number | undefined, t?: string | number | undefined}): string | null {
  const drawTextParts = [
    options.to ? `end=${convertTimeToSeconds(options.to)}` : null,
    options.ss ? `start=${convertTimeToSeconds(options.ss)}` : null,
    options.t ? `duration=${convertTimeToSeconds(options.t)}` : null,
  ].filter(v => v).join(':')
  return drawTextParts ? `trim=${drawTextParts},setpts=PTS-STARTPTS` : null
}

function atrim(options: { ss?: string | number | undefined, to?: string | number | undefined, t?: string | number | undefined}): string | null {
  const drawTextParts = [
    options.to ? `end=${convertTimeToSeconds(options.to)}` : null,
    options.ss ? `start=${convertTimeToSeconds(options.ss)}` : null,
    options.t ? `duration=${convertTimeToSeconds(options.t)}` : null,
  ].filter(v => v).join(':')
  return drawTextParts ? `atrim=${drawTextParts},asetpts=PTS-STARTPTS` : null
}

interface Global {
  width?: number,
  height?: number,
}

interface Input {
  fileName: string,
  ss?: string | number,
  to?: string | number,
  t?: string | number,
}

interface Custom {
  na?: boolean
  audioOnly?: boolean,
  audioIndex?: number // custom
  useTrimFilter?: boolean
}

interface Filter {
  reverse?: boolean,
  cropX?: number,
  cropY?: number,
  fps?: number,
  saturation?: number,
  brightness? : number,
  gamma?: number,
  contrast?: number
  volume?: number,
  draw?: DrawTextOptions
}

interface FileOperations extends Custom, Filter, Input {}

type Stack = ({ type: 'file', value: FileOperations } | { type: 'frame', value: FrameOptions })[]

interface Options {
  print?: boolean,
  width: number,
  height: number,
  fps: number,
  useTrimFilter?: boolean,
  open?: boolean
  output: string
  pixelFormat?: string
}

interface FrameProps {
  audioIndex?: number,
  color?: string,
  width: number
  height: number,
  fps: number,
  duration: number
}

const frame = (o: {
  color?: string,
  width: number
  height: number,
  fps: number,
  duration: number
  draw?: DrawTextOptions
}) => `-f lavfi -i ${[
  `color=${o.color || 'black'}`,
  `s=${o.width}x${o.height}`,
  `d=${o.duration}`,
  `r=${o.fps}`
].filter(v => v).join(':')}`

const file = (o: {
  useTrimFilter?: boolean,
  ss?: string | number,
  to?: string | number,
  t?: string | number,
  fileName: string
}) => [
  ...((o.useTrimFilter === true) ? [] : [
    o.ss ? `-ss ${convertSecondsToTime(o.ss)}` : null,
    o.to ? `-to ${convertSecondsToTime(o.to)}` : null,
    o.t ? `-t ${convertSecondsToTime(o.t)}` : null
  ]),
  `-i ${o.fileName}`
].filter(v => v).join(' ')

const videoFilters = (o: Omit<Input, 'fileName'> & Filter & Global & Custom) => [
  o.fps ? `fps=${o.fps}` : null,
  o.width && o.height ? `crop=${o.width}:${o.height}:${o.cropX || 0}:${o.cropY || 0}` : null,
  (o.saturation || o.brightness || o.gamma || o.contrast) ? `eq=${[
    o.saturation ? `saturation=${o.saturation}` : null,
    o.brightness ? `brightness=${o.brightness}` : null,
    o.gamma ? `gamma=${o.gamma}` : null,
    o.contrast ? `contrast=${o.contrast}` : null,
  ].filter(v => v).join(':')}` : null,
  (o.draw) ? buildDrawTextString(o.draw) : null,
  (o.useTrimFilter === true) ? trim(o) : null,
  // make sure reverse comes after trim because it will trim the reversed video instead of for the original
  o.reverse ? 'reverse' : null,
].filter(v => v).join(',')

const audioFilters = (o: Omit<Input, 'fileName'> & Filter & Global & Custom) => [
  o.volume ? `volume=${o.volume}` : null,
  (o.useTrimFilter === true) ? atrim(o) : null,
].filter(v => v).join(',')

const main = (movie: Stack, options: Options & { humanReadable?: boolean }) => {
  const { 
    humanReadable = false
  } = options;

  const nullAudioIndex = movie.length 

  const inputString: string[] = [];
  const filterComplex: string[] = [];
  const tracks: string[] = []

  const lookup: {[key: string]: { vid?: string, aid: string}} = {}

  movie.forEach((item, index) => {
    const inputIndex = index
    const af = audioFilters({...options, ...item.value})
    const filteredAid = `[audio${inputIndex}]`
    const defaultAid = `[${inputIndex}:a:0]`
    const perscribedAid = item.value.audioIndex
        ? lookup[item.value.audioIndex].aid
        : item.type == 'frame' || item.value.na
          ? `[${nullAudioIndex}:a:0]`
          : null

    const aid = perscribedAid ? perscribedAid : af ? filteredAid : defaultAid

    if (item.type == 'file') {
      inputString.push(file({...options, ...item.value }));
    } else if (item.type == 'frame') {
      inputString.push(frame({...options, ...item.value}));
    }
    if (!perscribedAid && af) filterComplex.push(`[${inputIndex}:a:0]${af}[audio${inputIndex}]`);
    
    

    if (item.type === 'file' && item.value?.audioOnly) {
      lookup[index] = { aid }
      return;
    }

    const vf = videoFilters({...options, ...item.value})
    const vid = vf ? `[video${inputIndex}]` :  `[${inputIndex}:v:0]`
    if (vf) filterComplex.push(`[${inputIndex}:v:0]${vf}[video${inputIndex}]`);

    lookup[index] = { vid, aid }
  });
  
  movie.forEach((item, index) => {
    if (item.type === 'file' && item.value.audioOnly) return;
    const { aid, vid } = lookup[index]
    tracks.push(`${vid}${aid}`);
  });

  const total = [
    '',
    [
      filterComplex.join(humanReadable ? ';\\\n' : ';'),
      tracks.join(humanReadable ? '\\\n' : ''),
    ].join(humanReadable ? ';\\\n' : ';'),
    '',
  ].join(humanReadable ? '\\\n' : '')

  return [
    'ffmpeg',
    ...inputString, 
    `-f lavfi -t 0.1 -i anullsrc`,
    `-filter_complex "${total}concat=n=${tracks.length}:v=1:a=1[outv][outa]"`,
    `-map "[outv]" -map "[outa]"`,
    // `-c:v libx264 -preset slow -movflags faststart`,
    options.pixelFormat ? `-pix_fmt ${options.pixelFormat}` : null,
    `${options.output} -y`
  ].filter(v => v).join(humanReadable ? ' \\\n' : ' ')
}

type FrameOptions = Omit<FrameProps, 'width' | 'height' | 'fps'> & { draw?: DrawTextOptions }

export class Movie {
  constructor (public options: Options) {}
  stack: ({ type: 'file', value: FileOperations } | { type: 'frame', value: FrameOptions })[] = []
  addFile(opt: FileOperations) {
    this.stack.push({ type: 'file', value: opt})
    return this.stack.length - 1
  }
  addFrame (opt: FrameOptions) {
    this.stack.push({ type: 'frame', value: opt})
    return this.stack.length - 1
  }
  build (opts?: Partial<Options> & { humanReadable?: boolean }) {
    return main(this.stack, {...this.options, ...opts})
  }
  async execute () {
    const print = this.options.print
    if (print) {
      console.log(this.build({ ...this.options, humanReadable: true }))
    } else {
      await $.raw`${this.build({ ...this.options })}`
      if (this.options.open) {
        await $`sleep 1`
        await $`open ${this.options.output}`
      }
    }
  }
}
