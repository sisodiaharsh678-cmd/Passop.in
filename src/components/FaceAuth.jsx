import React, { useEffect, useMemo, useRef, useState } from 'react'
import Webcam from 'react-webcam'
import * as faceapi from 'face-api.js'

// Use a known working CDN path for demo models
const MODELS_URI = 'https://justadudewhohacks.github.io/face-api.js/models'

async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URI),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URI),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URI),
  ])
}

function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

function descriptorToArray(desc) {
  if (!desc) return null
  return Array.from(desc)
}

function arrayToFloat32(arr) {
  if (!arr) return null
  return Float32Array.from(arr)
}

function getStoredDescriptor() {
  try {
    const raw = localStorage.getItem('faceDescriptor')
    if (!raw) return null
    const arr = JSON.parse(raw)
    return arrayToFloat32(arr)
  } catch {
    return null
  }
}

function saveDescriptor(desc) {
  try {
    const arr = descriptorToArray(desc)
    localStorage.setItem('faceDescriptor', JSON.stringify(arr))
    return true
  } catch {
    return false
  }
}

export default function FaceAuth({ mode = 'verify', onSuccess, onCancel, threshold = 0.5 }) {
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Initializing camera and models...')
  const webcamRef = useRef(null)

  const videoConstraints = useMemo(() => ({ facingMode: 'user' }), [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await loadModels()
        if (mounted) setReady(true)
        setStatus('Ready. Align your face and click Scan')
      } catch (e) {
        console.error('Face models load error', e)
        setStatus('Failed to load face models')
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const captureAndProcess = async () => {
    try {
      if (!webcamRef.current) return
      const screenshot = webcamRef.current.getScreenshot()
      if (!screenshot) {
        setStatus('Unable to capture image. Ensure camera permission granted.')
        return
      }
      const img = new Image()
      img.src = screenshot
      await new Promise((res, rej) => {
        img.onload = () => res()
        img.onerror = rej
      })
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 })
      const det = await faceapi.detectSingleFace(img, options).withFaceLandmarks(true).withFaceDescriptor()
      if (!det || !det.descriptor) {
        setStatus('No face detected. Try again.')
        if (typeof onFail === 'function') onFail({ reason: 'no_face' })
        return
      }
      if (mode === 'enroll') {
        if (saveDescriptor(det.descriptor)) {
          setStatus('Face enrolled successfully')
          onSuccess && onSuccess({ enrolled: true })
        } else {
          setStatus('Failed to save face template')
        }
        return
      }
      // verify
      const stored = getStoredDescriptor()
      if (!stored) {
        setStatus('No enrolled face found. Please enroll first.')
        if (typeof onFail === 'function') onFail({ reason: 'no_enrollment' })
        return
      }
      const dist = euclideanDistance(det.descriptor, stored)
      if (dist <= threshold) {
        setStatus('Face verified')
        onSuccess && onSuccess({ verified: true, distance: dist })
      } else {
        setStatus(`Face not recognized (distance: ${dist.toFixed(3)}). Try again.`)
        if (typeof onFail === 'function') onFail({ reason: 'mismatch', distance: dist })
      }
    } catch (e) {
      console.error('Face scan error', e)
      setStatus('Face scan failed. Check camera permissions and try again.')
      if (typeof onFail === 'function') onFail({ reason: 'error', error: e })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl p-4 w-[95%] max-w-md shadow-lg">
        <h3 className="text-xl font-semibold mb-2">{mode === 'enroll' ? 'Enroll Face' : 'Verify Face'}</h3>
        <div className="rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
          {ready ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/png"
              videoConstraints={videoConstraints}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-white p-4">Loading models...</div>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2 min-h-5">{status}</p>
        <div className="mt-3 flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Cancel</button>
          <button onClick={captureAndProcess} className="px-3 py-2 rounded-md bg-green-500 text-white hover:bg-green-600">Scan</button>
        </div>
      </div>
    </div>
  )
}
