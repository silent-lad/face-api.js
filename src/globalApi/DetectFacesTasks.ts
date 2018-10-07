import { TNetInput } from 'tfjs-image-recognition-base';
import { TinyYolov2Options } from 'tfjs-tiny-yolov2';

import { FaceDetection } from '../classes/FaceDetection';
import { MtcnnOptions } from '../mtcnn/MtcnnOptions';
import { SsdMobilenetv1Options } from '../ssdMobilenetv1/SsdMobilenetv1Options';
import { TinyFaceDetectorOptions } from '../tinyFaceDetector/TinyFaceDetectorOptions';
import { ComposableTask } from './ComposableTask';
import { DetectAllFaceLandmarksTask, DetectSingleFaceLandmarksTask } from './DetectFacesLandmarksTasks';
import { nets } from './nets';
import { FaceDetectionOptions } from './types';

export function detectSingleFace(
  input: TNetInput,
  options: FaceDetectionOptions = new SsdMobilenetv1Options()
): DetectSingleFaceTask {
  return new DetectSingleFaceTask(input, options)
}

export function detectAllFaces(
  input: TNetInput,
  options: FaceDetectionOptions = new SsdMobilenetv1Options()
): DetectAllFacesTask {
  return new DetectAllFacesTask(input, options)
}

export class DetectFacesTaskBase<TReturn> extends ComposableTask<TReturn> {
  constructor(
    protected input: TNetInput,
    protected options: FaceDetectionOptions = new SsdMobilenetv1Options()
  ) {
    super()
  }
}

export class DetectAllFacesTask extends DetectFacesTaskBase<FaceDetection[]> {

  public async run(): Promise<FaceDetection[]> {

    const { input, options } = this

    if (options instanceof MtcnnOptions) {
      return (await nets.mtcnn.forward(input, options))
        .map(result => result.faceDetection)
    }

    const faceDetectionFunction = options instanceof TinyFaceDetectorOptions
      ? (input: TNetInput) => nets.tinyFaceDetector.locateFaces(input, options)
      : (
        options instanceof SsdMobilenetv1Options
          ? (input: TNetInput) => nets.ssdMobilenetv1.locateFaces(input, options)
          : (
            options instanceof TinyYolov2Options
              ? (input: TNetInput) => nets.tinyYolov2.locateFaces(input, options)
              : null
          )
      )

    if (!faceDetectionFunction) {
      throw new Error('detectFaces - expected options to be instance of TinyFaceDetectorOptions | SsdMobilenetv1Options | MtcnnOptions | TinyYolov2Options')
    }

    return faceDetectionFunction(input)
  }

  withFaceLandmarks(useTinyLandmarkNet: boolean = false): DetectAllFaceLandmarksTask {
    return new DetectAllFaceLandmarksTask(this, this.input, useTinyLandmarkNet)
  }

}

export class DetectSingleFaceTask extends DetectFacesTaskBase<FaceDetection | undefined> {

  public async run(): Promise<FaceDetection | undefined> {
    return (await new DetectAllFacesTask(this.input, this.options))
      .sort((f1, f2) => f1.score - f2.score)[0]
  }

  withFaceLandmarks(useTinyLandmarkNet: boolean = false): DetectSingleFaceLandmarksTask {
    return new DetectSingleFaceLandmarksTask(this, this.input, useTinyLandmarkNet)
  }

}