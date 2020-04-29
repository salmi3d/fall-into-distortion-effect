import './app.css'
import * as THREE from 'three'
import gsap from 'gsap'
import vertex from './shader/vertex.glsl'
import fragment from './shader/fragment.glsl'

const OrbitControls = require('three-orbit-controls')(THREE)

console.clear()

const assets = {
  hobbiton: {
    type: 'image',
    url: require('./static/hobbiton.jpg')// https://unsplash.com/photos/7XKkJVw1d8c
  }
}

export class App {

  constructor({ el }) {
    this.container = el

    this.tick = this.tick.bind(this)
    this.play = this.play.bind(this)
    this.pause = this.pause.bind(this)
    this.render = this.render.bind(this)
    this.addObjects = this.addObjects.bind(this)
    this.onResize = this.onResize.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)
    this.loadAssets = this.loadAssets.bind(this)
    this.onMouseAndTouchUpDown = this.onMouseAndTouchUpDown.bind(this)

    this.loadAssets().then(() => this.init.call(this))
  }

  loadAssets() {
    const manager = new THREE.LoadingManager()
    const progressMeter = {}

    return new Promise((resolve, reject) => {
      manager.onLoad = () => {
        for (const item of Object.values(progressMeter)) item.remove()
        resolve()
      }

      manager.onError = url => reject(`There was an error during loading asset ${url}`)
      manager.onProgress = url => progressMeter[url].style.setProperty('--progress', 100)

      for (const asset of Object.values(assets)) {
        const progress = document.createElement('div')
        progress.classList.add('progress')
        this.container.appendChild(progress)
        progressMeter[asset.url] = progress

        if (asset.type === 'image') {
          const loader = new THREE.TextureLoader(manager)
          loader.load(
            asset.url,
            data => asset.data = data
          )
        }
      }
    })
  }

  init() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

    this.renderer = new THREE.WebGLRenderer({ antialias: false })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0xeeeeee, 1)
    this.renderer.physicallyCorrectLights = true
    this.renderer.outputEncoding = THREE.sRGBEncoding

    this.container.append(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width / this.height,
      0.001,
      10000
    )
    this.camera.position.z = 2
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.scene = new THREE.Scene()

    this.time = 0
    this.paused = false

    this.raycaster = new THREE.Raycaster()
    this.objects = {}
    this.mouse = this.prevMouse = new THREE.Vector2()
    this.mouseSpeed = this.targetMouseSpeed = 0

    this.addObjects()
    this.onResize()
    this.tick()


    window.addEventListener("resize", this.onResize)
    window.addEventListener("mousemove", this.onMouseMove)
    window.addEventListener("touchmove", this.onTouchMove)
    window.addEventListener('visibilitychange', () => document.hidden ? this.pause() : this.play())
    this.onMouseAndTouchUpDown()
  }

  onTouchMove(ev) {
    const { clientX, clientY } = ev.targetTouches[0]
    this.onMouseMove({ clientX, clientY })
  }

  onMouseMove(ev) {
    this.mouse = {
      x: ev.clientX / window.innerWidth,
      y: 1 - ev.clientY / window.innerHeight
    }

    this.material.uniforms.mouse.value = this.mouse

    this.raycaster.setFromCamera(
      {
        x: (ev.clientX / window.innerWidth) * 2 - 1,
        y: -(ev.clientY / window.innerHeight) * 2 + 1
      },
      this.camera
    )
  }

  getMouseSpeed() {
    const { x: x2, y: y2 } = this.prevMouse
    const { x: x1, y: y1 } = this.mouse
    this.mouseSpeed = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    this.targetMouseSpeed += 0.1 * (this.mouseSpeed - this.targetMouseSpeed)
    this.prevMouse = this.mouse
  }

  addObjects() {
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: '#extension GL_OES_standard_derivatives'
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: 'f', value: 0 },
        progress: { type: 'f', value: 0 },
        direction: { type: 'f', value: 0 },
        mouseSpeed: { type: 'f', value: 0 },
        mouse: { type: 'v2', value: new THREE.Vector2() },
        texture: { type: 't', value: assets.hobbiton.data },
        resolution: { type: 'v4', value: new THREE.Vector4() },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: vertex,
      fragmentShader: fragment,
    })
    this.geometry = new THREE.PlaneGeometry(1, 1, 10, 10)
    this.objects.plane = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.objects.plane)
  }

  getViewSize() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180
    const height = Math.abs(
      this.camera.position.z * Math.tan(fovInRadians / 2) * 2
    )

    return { width: height * this.camera.aspect, height }
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  tick() {
    if (this.paused) return
    this.time += 0.05
    this.getMouseSpeed()
    this.material.uniforms.mouseSpeed.value = this.targetMouseSpeed
    this.material.uniforms.time.value = this.time
    this.render()
    requestAnimationFrame(this.tick)
  }

  onResize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height

    const distance = this.camera.position.z
    this.camera.fov = 2 * (180 / Math.PI) * Math.atan(1 / (2 * distance))

    const { naturalWidth: imgWidth, naturalHeight: imgHeight } = this.material.uniforms.texture.value.image
    const imageAspect = imgHeight / imgWidth
    let a1, a2
    if (this.height / this.width > imageAspect) {
      a1 = this.width / this.height * imageAspect
      a2 = 1
    } else {
      a1 = 1
      a2 = this.height / this.width / imageAspect
    }

    this.material.uniforms.resolution.value.x = this.width
    this.material.uniforms.resolution.value.y = this.height
    this.material.uniforms.resolution.value.z = a1
    this.material.uniforms.resolution.value.w = a2


    if (this.width / this.height > 1) {
      this.objects.plane.scale.x = this.camera.aspect
    } else {
      this.objects.plane.scale.y = 1 / this.camera.aspect
    }

    this.camera.updateProjectionMatrix()
  }

  onMouseAndTouchUpDown() {
    const on = ['mousedown', 'touchstart']
    const off = ['mouseup', 'touchend']

    on.forEach(e => {
      window.addEventListener(e, () => {
        this.material.uniforms.direction.value = 0
        gsap.to(this.material.uniforms.progress, {
          value: 1,
          duration: 0.5,
        })
      })
    })

    off.forEach(e => {
      window.addEventListener(e, () => {
        this.material.uniforms.direction.value = 1
        gsap.to(this.material.uniforms.progress, {
          value: 0,
          duration: 0.5,
        })
      })
    })

  }

  pause() {
    this.paused = true
  }

  play() {
    this.paused = false
  }

}
