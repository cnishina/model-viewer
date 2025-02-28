/* @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ModelViewerElementBase, {$canvas, $onResize, $renderer} from '../../model-viewer-base.js';
import ModelScene from '../../three-components/ModelScene.js';
import Renderer from '../../three-components/Renderer.js';

const expect = chai.expect;

const ModelViewerElement = class extends ModelViewerElementBase {
  static get is() {
    return 'model-viewer-renderer';
  }
};

interface TestScene {
  renderCount?: number;
}

customElements.define('model-viewer-renderer', ModelViewerElement);

function createScene(): ModelScene&TestScene {
  const element = new ModelViewerElement();
  const renderer = element[$renderer];
  const scene: ModelScene&TestScene = new ModelScene({
    element: element,
    canvas: element[$canvas],
    width: 200,
    height: 100,
    renderer,
  });
  scene.isVisible = true;

  scene.renderCount = 0;
  const drawImage = scene.context.drawImage;
  (scene.context as any).drawImage = (...args: any[]) => {
    (scene.renderCount as number)++;
    (drawImage as any).call(scene.context, ...args);
  };

  renderer.registerScene(scene);

  return scene;
}

suite('Renderer', () => {
  let scene: ModelScene&TestScene;
  let renderer: Renderer;

  setup(() => {
    scene = createScene();
    renderer = scene.renderer;
  });

  teardown(() => {
    renderer.unregisterScene(scene);
  });

  suite('render', () => {
    let otherScene: ModelScene&TestScene;

    setup(() => {
      otherScene = createScene();
    });

    teardown(() => {
      renderer.unregisterScene(otherScene);
    });

    test('renders only dirty scenes', async function() {
      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(0);
      expect(otherScene.renderCount).to.be.equal(0);

      scene.isDirty = true;
      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1);
      expect(otherScene.renderCount).to.be.equal(0);
    });

    test('marks scenes no longer dirty after rendering', async function() {
      scene.isDirty = true;

      renderer.render(performance.now());

      expect(scene.renderCount).to.be.equal(1);
      expect(!scene.isDirty).to.be.ok;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1);
      expect(!scene.isDirty).to.be.ok;
    });

    test('does not render scenes marked as !isVisible', async function() {
      scene.isVisible = false;
      scene.isDirty = true;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(0);
      expect(scene.isDirty).to.be.ok;

      scene.isVisible = true;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1);
      expect(!scene.isDirty).to.be.ok;
    });

    suite('when resizing', () => {
      let originalDpr: number;

      setup(() => {
        originalDpr = self.devicePixelRatio;
      });

      teardown(() => {
        Object.defineProperty(self, 'devicePixelRatio', {value: originalDpr});
      });

      test('updates effective DPR', async () => {
        const {element} = scene;
        const initialDpr = renderer.renderer.getPixelRatio();
        const {width, height} = scene.getSize();

        element[$onResize]({width, height});

        Object.defineProperty(
            self, 'devicePixelRatio', {value: initialDpr + 1});

        await new Promise(resolve => requestAnimationFrame(resolve));

        const newDpr = renderer.renderer.getPixelRatio();

        expect(newDpr).to.be.equal(initialDpr + 1);
      });
    });
  });
});
