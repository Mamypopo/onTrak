package com.ontrak.mdm.config

object MQTTConfig {
    /**
     * MQTT Broker URL
     * 
     * รูปแบบ: tcp://host:port หรือ ssl://host:port
     * 
     * ตัวอย่าง:
     * - tcp://192.168.1.100:1883 (IP ภายใน, ไม่เข้ารหัส)
     * - tcp://mqtt.example.com:1883 (Domain, ไม่เข้ารหัส)
     * - ssl://mqtt.example.com:8883 (Domain, เข้ารหัส SSL/TLS)
     * - tcp://localhost:1883 (Localhost สำหรับทดสอบ)
     * 
     * พอร์ตมาตรฐาน:
     * - 1883 = MQTT (ไม่เข้ารหัส)
     * - 8883 = MQTT over SSL/TLS (เข้ารหัส)
     * 
     * TODO: เปลี่ยนเป็นค่าจริงของ MQTT Broker ของคุณ
     * หรือใช้ SharedPreferences/BuildConfig เพื่อตั้งค่าแบบ dynamic
     */
    const val BROKER_URL = "tcp://your-mqtt-broker:1883"
    
    /**
     * Prefix สำหรับ Client ID
     * Client ID จะเป็น: {CLIENT_ID_PREFIX}{deviceId}
     * เช่น: ontrak_tablet_abc123def456
     */
    const val CLIENT_ID_PREFIX = "ontrak_tablet_"
    
    /**
     * Username และ Password สำหรับ authentication
     * ถ้า Broker ไม่ต้องการ authentication ให้เว้นว่างไว้
     */
    const val USERNAME = ""
    const val PASSWORD = ""
    
    // Topic structure
    fun getStatusTopic(deviceId: String): String = "tablet/$deviceId/status"
    fun getLocationTopic(deviceId: String): String = "tablet/$deviceId/location"
    fun getMetricsTopic(deviceId: String): String = "tablet/$deviceId/metrics"
    fun getEventTopic(deviceId: String): String = "tablet/$deviceId/event"
    fun getCommandTopic(deviceId: String): String = "tablet/$deviceId/command"
}

