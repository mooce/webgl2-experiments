import "./scss/index.scss";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Demo from "./demo";
import Slider from "./components/slider";
import Switch from "./components/switch";
import InlineError from "./components/error";

type GeometryType = "cube" | "sphere"

class Container extends React.Component {

  state: {
    error?: Error,
    loading: boolean,
    controls: {
      geometry: GeometryType,
      normal: number,
      speed: number,
      lights: number
    }
  } = {
      error: undefined,
      loading: false,
      controls: {
        geometry: 'cube',
        normal: 0.5,
        speed: 1.0,
        lights: 3
      }
    }

  canvas: React.RefObject<HTMLCanvasElement>

  constructor(props: any) {
    super(props);

    document.title = "Normal Mapping"

    this.canvas = React.createRef<HTMLCanvasElement>();
  }

  private doTask(task: () => Promise<any>) {

    const { loading } = this.state

    if (!loading) {
      this.setState({ loading: true }, () => {
        task()
          .catch(error => {
            this.setState({ error, loading: false })
          })
          .then((value) => {

            if (!value) {
              value = {}
            }

            this.setState({ controls: { ...this.state.controls, ...value }, loading: false })
          })
      })
    }
  }

  private onChangeNormal(normal: number) {

    this.setState({ controls: { ...this.state.controls, normal } })
  }

  private onChangeLights(lights: number) {

    this.doTask(async () => {
      await Demo.setLightCount(lights)
      return { lights }
    })
  }

  private onChangeGeometry(geometry: string) {

    this.doTask(async () => {
      await Demo.setGeometry(geometry)
      return { geometry }
    })
  }

  private onChangeAnimation(speed: number) {

    this.setState({ controls: { ...this.state.controls, speed } })
  }

  componentDidMount() {

    this.doTask(async () => {
      await Demo.create(this.canvas.current)

      this.onRenderFrame()

      await Demo.loadAssets(this.state.controls)
    })
  }

  componentWillUnmount() {

    Demo.release()
  }

  private async onRenderFrame() {
    await Demo.render(this.state.controls)
    requestAnimationFrame(() => this.onRenderFrame())
  }

  private renderPanel() {

    const { error, loading, controls } = this.state

    return (<div className={`panel ${loading ? 'loading' : ''}`}>
      <h1>Normal Mapping</h1>
      <Slider label="Animation Speed" min={0} max={1} step={0.01} value={controls.speed} onChange={value => this.onChangeAnimation(value)} />
      <Slider label="Normal Mapping" min={0} max={1} step={0.01} value={controls.normal} onChange={value => this.onChangeNormal(value)} />
      <Slider label="Lights" min={1} max={5} step={1} value={controls.lights} onChange={value => this.onChangeLights(value)} />
      <Switch label="Geometry" options={[{ value: 'cube', label: 'Cube' }, { value: 'sphere', label: 'Sphere' }]} onClick={value => this.onChangeGeometry(value)} />
      {error && <InlineError error={error} />}
    </div>)
  }

  render() {
    return <div>
      {this.renderPanel()}
      <canvas ref={this.canvas} width="1920" height="1080"></canvas>
    </div>
  }
}

ReactDOM.render(<Container />, document.getElementById("container"));
