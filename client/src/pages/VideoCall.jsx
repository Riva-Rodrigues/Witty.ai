import React, { useRef, useState } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import RecordRTC from "recordrtc";
import { useNavigate } from "react-router-dom";

function randomID(len) {
  let result = "";
  var chars = "12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP",
    maxPos = chars.length;
  len = len || 5;
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

export function getUrlParams(url = window.location.href) {
  let urlStr = url.split("?")[1];
  return new URLSearchParams(urlStr);
}

export default function App() {
  const roomID = getUrlParams().get("roomID") || randomID(5);
  const recorderRef = useRef(null);
  const [userName, setUserName] = useState("");
  const [showNameInput, setShowNameInput] = useState(true);
  const [uploadStatus, setUploadStatus] = useState("");
  const [showEndScreen, setShowEndScreen] = useState(false);
  const navigate = useNavigate();

  const uploadToServer = async (blob) => {
    try {
      const formData = new FormData();
      const filename = `meeting.mp4`;
      formData.append("video", blob, filename);

      setUploadStatus("Uploading...");
      
      const response = await fetch("http://localhost:5001/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setUploadStatus("Upload successful!");
        setShowEndScreen(true);
        console.log("Upload success:", data);
      } else {
        setUploadStatus("Upload failed. Please try again.");
        console.error("Upload failed:", data);
      }
    } catch (error) {
      setUploadStatus("Upload failed. Please try again.");
      console.error("Upload error:", error);
    }
  };

  const convertToMP4 = async (webmBlob) => {
    return new Promise((resolve) => {
      const mediaSource = new MediaSource();
      const video = document.createElement('video');
      video.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener('sourceopen', async () => {
        const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');
        const fileReader = new FileReader();

        fileReader.onload = async (e) => {
          sourceBuffer.appendBuffer(e.target.result);
          sourceBuffer.addEventListener('updateend', () => {
            mediaSource.endOfStream();
            const mp4Blob = new Blob([e.target.result], { type: 'video/mp4' });
            resolve(mp4Blob);
          });
        };

        fileReader.readAsArrayBuffer(webmBlob);
      });
    });
  };

  let myMeeting = async (element) => {
    const appID = 1436332283;
    const serverSecret = "3b61befb20fe0a04a6ccd43d736867de";
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      randomID(5),
      userName || "User"
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zp.joinRoom({
      container: element,
      sharedLinks: [
        {
          name: "Personal link",
          url:
            window.location.protocol +
            "//" +
            window.location.host +
            window.location.pathname +
            "?roomID=" +
            roomID,
        },
      ],
      scenario: {
        mode: ZegoUIKitPrebuilt.VideoConference,
      },
      onJoinRoom: () => startRecording(element),
      onLeaveRoom: stopRecording,
    });
  };

  const startRecording = async (element) => {
    try {
      const videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      recorderRef.current = new RecordRTC(combinedStream, {
        type: "video",
        mimeType: "video/webm",
        recorderType: RecordRTC.MediaStreamRecorder,
        bitsPerSecond: 128000,
      });

      recorderRef.current.startRecording();
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = async () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording(async () => {
        const webmBlob = recorderRef.current.getBlob();
        try {
          const mp4Blob = await convertToMP4(webmBlob);
          await uploadToServer(mp4Blob);
        } catch (error) {
          console.error("Error processing recording:", error);
          setUploadStatus("Error processing recording. Please try again.");
        }
      });
    }
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      setShowNameInput(false);
    }
  };

  const handleReviewMeeting = () => {
    navigate(`/video-review`);
  };

  if (showEndScreen) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#1a1b1d',
        color: 'white',
      }}>
        <h2 style={{ marginBottom: '2rem' }}>You have left the room.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#0066FF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              width: '250px'
            }}
          >
            Rejoin
          </button>
          <button
            onClick={handleReviewMeeting}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#2E2F33',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              width: '250px'
            }}
          >
            Review Meeting
          </button>
          <button
            onClick={() => navigate('/video-meet')}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: 'transparent',
              color: '#0066FF',
              border: '1px solid #0066FF',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              width: '250px'
            }}
          >
            Return to home screen
          </button>
        </div>
      </div>
    );
  }

  if (showNameInput) {
    return (
      <div className="name-input-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <form onSubmit={handleJoinMeeting} style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Enter Your Name</h2>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your Name"
            required
            style={{
              padding: '0.5rem',
              marginRight: '1rem',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Join Meeting
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div
        className="myCallContainer"
        ref={myMeeting}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}